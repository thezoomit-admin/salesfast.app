/**
 * The real API client (src/api/client.ts) against a local HTTP server:
 * token refresh + retry, account switches during a refresh, pinned
 * requests, cancellation and offline reporting. Only the keystore, saved
 * accounts, connectivity and config are in-memory stand-ins (test/stubs).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

import { setApiBaseUrl } from '../../test/stubs/config.mjs';
import { reports } from '../../test/stubs/connectivity.mjs';
import { saved } from '../../test/stubs/savedAccounts.mjs';
import { calls, secureStorage, store } from '../../test/stubs/secureStorage.mjs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Server state, reset per test. */
let server;
let valid; // access token → owning account
let refresh; // (body) => Promise<{ status, body }>
let hits;
let delays;

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

before(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      const path = req.url.split('?')[0];
      hits.push(`${req.method} ${path}`);
      if (path === '/api/auth/mobile/refresh') {
        await wait(delays.refresh);
        const { status, body } = await refresh(JSON.parse(raw || '{}'));
        return json(res, status, body);
      }
      await wait(delays.detail);
      const token = (req.headers.authorization ?? '').replace('Bearer ', '');
      const owner = valid.get(token);
      if (!owner) return json(res, 401, { message: 'Invalid or expired token' });
      return json(res, 200, { data: { id: Number(path.split('/').pop()), owner } });
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  setApiBaseUrl(`http://127.0.0.1:${server.address().port}/api`);
});
after(() => server.close());

let client;
let authLost;
beforeEach(async () => {
  client ??= await import('./client.ts');
  valid = new Map();
  hits = [];
  delays = { detail: 5, refresh: 5 };
  reports.length = 0;
  calls.clearSession = 0;
  saved.clear();
  store.clear();
  authLost = 0;
  client.setAuthLostHandler(() => (authLost += 1));
  await secureStorage.saveSession({
    accessToken: 'A-expired',
    refreshToken: 'A-r1',
    accountId: 'A',
    userJson: '{}',
  });
  refresh = async ({ accountId }) => {
    valid.set(`${accountId}-fresh`, accountId);
    return {
      status: 200,
      body: {
        data: {
          accessToken: `${accountId}-fresh`,
          refreshToken: `${accountId}-r2`,
          user: { id: accountId, name: accountId, email: `${accountId}@x.test` },
        },
      },
    };
  };
});

const getLead = (id, config) => client.api.get(`/crm/leads/${id}`, config);

describe('expired access token', () => {
  it('concurrent 401s share one refresh, then every request is retried once', async () => {
    const results = await Promise.all([getLead(1), getLead(2), getLead(3)]);
    assert.deepEqual(results.map((r) => r.data.data.owner), ['A', 'A', 'A']);
    assert.equal(hits.filter((h) => h.includes('refresh')).length, 1);
    assert.equal(hits.filter((h) => h.startsWith('GET')).length, 6);
    assert.equal(store.get('access'), 'A-fresh');
    assert.equal(store.get('refresh'), 'A-r2');
    assert.equal(saved.get('A').refreshToken, 'A-r2');
  });

  it('a rejected refresh for the active account signs it out', async () => {
    refresh = async () => ({ status: 401, body: { message: 'revoked' } });
    await assert.rejects(getLead(1), (e) => e.response?.status === 401);
    assert.equal(calls.clearSession, 1);
    assert.equal(authLost, 1);
  });

  it('costs one refresh plus one repeat of the request (timing model)', async (t) => {
    delays = { detail: 120, refresh: 200 };
    valid.set('A-ok', 'A');
    await secureStorage.updateTokens('A-ok');
    let start = performance.now();
    await getLead(1);
    const normal = performance.now() - start;
    await secureStorage.updateTokens('A-expired');
    start = performance.now();
    await getLead(1);
    const expired = performance.now() - start;
    t.diagnostic(`valid token ${Math.round(normal)}ms, expired token ${Math.round(expired)}ms`);
    // 401 round trip + refresh + retried request.
    assert.ok(expired >= 120 + 200 + 120, `expired path took ${expired}ms`);
    assert.ok(expired < 120 + 200 + 120 + 250, `expired path took ${expired}ms`);
  });
});

describe('account switch while a refresh is in flight', () => {
  const switchToB = () =>
    secureStorage.saveSession({
      accessToken: 'B-valid',
      refreshToken: 'B-r1',
      accountId: 'B',
      userJson: '{}',
    });

  it("never installs A's tokens as the active session, keeps them for A, signs no one out", async () => {
    valid.set('B-valid', 'B');
    delays.refresh = 80;
    const pending = getLead(7);
    await wait(30); // the 401 came back; A's refresh is on the wire
    await switchToB();
    await assert.rejects(pending, (e) => e instanceof client.AccountChangedError);

    assert.equal(store.get('account'), 'B');
    assert.equal(store.get('access'), 'B-valid');
    assert.equal(store.get('refresh'), 'B-r1');
    // A's rotated refresh token is not lost (the old one is retired).
    assert.equal(saved.get('A').refreshToken, 'A-r2');
    assert.equal(calls.clearSession, 0);
    assert.equal(authLost, 0);

    // B carries on with its own token and sees its own data.
    assert.equal((await getLead(7)).data.data.owner, 'B');
  });

  it("a failed refresh of A does not sign out B", async () => {
    delays.refresh = 80;
    refresh = async () => ({ status: 401, body: { message: 'revoked' } });
    const pending = getLead(7);
    await wait(30);
    await switchToB();
    await assert.rejects(pending, (e) => e instanceof client.AccountChangedError);
    assert.equal(store.get('account'), 'B');
    assert.equal(calls.clearSession, 0);
    assert.equal(authLost, 0);
  });
});

describe('request scoping and cancellation', () => {
  it('a request pinned to another account is never sent', async () => {
    await assert.rejects(
      getLead(1, { accountId: 'B' }),
      (e) => e instanceof client.AccountChangedError
    );
    assert.equal(hits.length, 0);
  });

  it('an aborted request is cancelled and does not mark the app offline', async () => {
    valid.set('A-ok', 'A');
    await secureStorage.updateTokens('A-ok');
    delays.detail = 200;
    const controller = new AbortController();
    const pending = getLead(1, { signal: controller.signal });
    await wait(30);
    controller.abort();
    await assert.rejects(pending, (e) => e.code === 'ERR_CANCELED');
    assert.ok(!reports.includes('unreachable'));
  });

  it('a request that gets no response marks the app offline', async () => {
    await assert.rejects(
      client.api.get('/crm/leads/1', { baseURL: 'http://127.0.0.1:9/api', timeout: 2000 })
    );
    assert.ok(reports.includes('unreachable'));
  });
});
