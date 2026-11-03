/**
 * The real disk cache (src/lib/queryPersistence.ts) on an in-memory file
 * system: one file per account, account-checked restores, placeholders never
 * written, a late response after an account switch, and no tokens on disk.
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { QueryClient, QueryObserver } from '@tanstack/query-core';
import { AxiosError } from 'axios';

import { disk } from '../../test/stubs/expo-file-system.mjs';
import {
  deleteQueryCache,
  persistQueryCache,
  restoreQueryCache,
} from './queryPersistence.ts';

const fileOf = (userId) => `file:///doc/query-cache-${userId}.json`;
const pendingOf = (userId) => `file:///doc/pending-writes-${userId}.json`;
const read = (uri) => JSON.parse(disk.get(uri));
const leadIdsIn = (uri) =>
  read(uri)
    .state.queries.filter((q) => q.queryKey[0] === 'lead')
    .map((q) => q.queryKey[1]);
const tick = () => new Promise((r) => setTimeout(r, 0));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};
const newClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const lead = (id, owner) => ({ id, owner, updatedAt: '2026-11-01T10:00:00Z' });

/** Loads data the way a screen does, so the persister sees a success event. */
const load = (client, key, data) =>
  client.fetchQuery({ queryKey: key, queryFn: async () => data });

beforeEach(() => disk.clear());

describe('per-account disk cache', () => {
  it("writes each account's data to its own file only", async () => {
    const a = newClient();
    const stopA = persistQueryCache(a, 'A');
    await load(a, ['lead', 1], lead(1, 'A'));
    stopA();
    assert.deepEqual(leadIdsIn(fileOf('A')), [1]);
    assert.equal(read(fileOf('A')).userId, 'A');
    assert.equal(disk.has(fileOf('B')), false);
  });

  it("refuses to load a file that belongs to another account (and deletes it)", async () => {
    const a = newClient();
    const stopA = persistQueryCache(a, 'A');
    await load(a, ['lead', 1], lead(1, 'A'));
    stopA();
    disk.set(fileOf('B'), disk.get(fileOf('A'))); // A's data under B's name

    const b = newClient();
    await restoreQueryCache(b, 'B');
    assert.equal(b.getQueryData(['lead', 1]), undefined);
    assert.equal(disk.has(fileOf('B')), false);
  });

  it('drops stale-format and expired files', async () => {
    const a = newClient();
    const stopA = persistQueryCache(a, 'A');
    await load(a, ['lead', 1], lead(1, 'A'));
    stopA();
    const saved = read(fileOf('A'));
    for (const broken of [
      { ...saved, version: saved.version + 1 },
      { ...saved, savedAt: Date.now() - 8 * 24 * 60 * 60_000 },
    ]) {
      disk.set(fileOf('A'), JSON.stringify(broken));
      const c = newClient();
      await restoreQueryCache(c, 'A');
      assert.equal(c.getQueryData(['lead', 1]), undefined);
    }
  });

  it('never writes list-row placeholder data as a lead detail', async () => {
    const a = newClient();
    const stopA = persistQueryCache(a, 'A');
    await load(a, ['my-leads', ''], { pages: [{ items: [lead(5, 'A')] }], pageParams: [1] });
    const observer = new QueryObserver(a, {
      queryKey: ['lead', 5],
      queryFn: () => new Promise(() => {}), // detail still loading
      placeholderData: () => lead(5, 'A'),
    });
    const unsubscribe = observer.subscribe(() => {});
    assert.equal(observer.getCurrentResult().isPlaceholderData, true);
    stopA();
    assert.deepEqual(leadIdsIn(fileOf('A')), []);
    unsubscribe();
  });

  it('a "not found" (null) detail replaces the saved copy', async () => {
    const a = newClient();
    const stopA = persistQueryCache(a, 'A');
    await load(a, ['lead', 3], lead(3, 'A'));
    await a.fetchQuery({ queryKey: ['lead', 3], queryFn: async () => null, staleTime: 0 });
    stopA();
    const saved = read(fileOf('A')).state.queries.find((q) => q.queryKey[1] === 3);
    assert.equal(saved.state.data, null);
  });

  it('removing an account stops its persister so a pending write cannot recreate the file', async () => {
    const a = newClient();
    persistQueryCache(a, 'A');
    await load(a, ['lead', 1], lead(1, 'A')); // write scheduled (throttled)
    deleteQueryCache('A');
    await new Promise((r) => setTimeout(r, 1_700));
    assert.equal(disk.has(fileOf('A')), false);
  });
});

describe('account switch with a detail request in flight', () => {
  it("A's late response reaches neither B's memory cache nor either file", async () => {
    const client = newClient();
    const stopA = persistQueryCache(client, 'A');
    await load(client, ['lead', 1], lead(1, 'A'));

    const attempts = [];
    const observer = new QueryObserver(client, {
      queryKey: ['lead', 2],
      queryFn: () => {
        const d = deferred();
        attempts.push(d);
        return d.promise;
      },
    });
    const unsubscribe = observer.subscribe(() => {});
    await tick();

    // The switch, in useAccountQueryCache order: stop A's persister (final
    // write), reset the client, load and persist B.
    stopA();
    const reset = client.resetQueries();
    await restoreQueryCache(client, 'B');
    const stopB = persistQueryCache(client, 'B');

    attempts[0].resolve(lead(2, 'A')); // A's request answers late
    await tick();
    assert.notEqual(client.getQueryData(['lead', 2])?.owner, 'A');

    attempts[1].resolve(lead(2, 'B')); // the screen's refetch as B
    await reset;
    stopB();
    assert.equal(client.getQueryData(['lead', 2]).owner, 'B');
    assert.deepEqual(leadIdsIn(fileOf('A')), [1]);
    const inB = read(fileOf('B')).state.queries.map((q) => q.state.data?.owner);
    assert.ok(!inB.includes('A'), `B's file holds A's data: ${inB}`);
    unsubscribe();
  });
});

describe('unsent offline writes on disk', () => {
  it('are saved per account without the failed request (and its Authorization header)', async () => {
    const client = newClient();
    const stop = persistQueryCache(client, 'A');
    const failure = new AxiosError('Network Error', 'ERR_NETWORK', {
      headers: { Authorization: 'Bearer secret-access-token' },
    });
    let attempt = 0;
    const mutation = client.getMutationCache().build(client, {
      mutationKey: ['add-note'],
      meta: { offline: true },
      retry: 1,
      retryDelay: 60_000,
      mutationFn: async () => {
        attempt += 1;
        throw failure;
      },
    });
    void mutation.execute({ accountId: 'A', clientId: 'c1', note: 'hi' }).catch(() => {});
    await tick();
    await tick();
    assert.equal(attempt, 1);
    assert.equal(mutation.state.status, 'pending');

    const text = disk.get(pendingOf('A'));
    assert.ok(text, 'pending write saved');
    assert.ok(!text.includes('Bearer'), 'no token on disk');
    assert.equal(JSON.parse(text).mutations[0].state.variables.clientId, 'c1');
    assert.equal(disk.has(pendingOf('B')), false);
    stop();
    client.clear();
  });
});
