/**
 * Lead detail cache behaviour, against a real QueryClient (no React Native).
 * Run: npm test
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { QueryClient, QueryObserver } from '@tanstack/query-core';
import { AxiosError } from 'axios';

import {
  detailOrNull,
  findListLead,
  leadDetailKey,
  markOutdatedLeadDetails,
} from './leadDetailCache.ts';

const row = (id, updatedAt, extra = {}) => ({
  id,
  updatedAt,
  buyerPersona: { fullName: `Lead ${id}`, phone: `+8801700000${id}` },
  leadStatus: { id: 1, name: 'New' },
  ...extra,
});
const detail = (id, updatedAt, extra = {}) => ({
  ...row(id, updatedAt),
  version: 4,
  notes: [{ id: 1, note: 'called', createdAt: updatedAt }],
  ...extra,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

let client;
const newClient = () =>
  (client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  }));
afterEach(() => client?.clear());

function seedLists(c) {
  c.setQueryData(['my-leads', '', undefined], {
    pages: [
      { items: [row(1, '2026-11-01T10:00:00Z'), row(2, '2026-11-01T10:00:00Z')], meta: {} },
      { items: [row(3, '2026-11-01T10:00:00Z')], meta: {} },
    ],
    pageParams: [1, 2],
  });
  c.setQueryData(['follow-up-leads', 'today'], {
    items: [row(2, '2026-11-02T08:00:00Z', { priority: 'HIGH' })],
    meta: {},
  });
}

describe('findListLead', () => {
  it('finds a row in any page of the infinite Leads list', () => {
    const c = newClient();
    seedLists(c);
    assert.equal(findListLead(c, 3)?.buyerPersona.fullName, 'Lead 3');
  });

  it('prefers the most recently updated copy across lists', () => {
    const c = newClient();
    seedLists(c);
    assert.equal(findListLead(c, 2)?.priority, 'HIGH');
  });

  it('returns undefined for an unknown lead or malformed cache data', () => {
    const c = newClient();
    seedLists(c);
    c.setQueryData(['my-leads', 'broken'], { pages: null });
    c.setQueryData(['follow-up-leads', 'odd'], 'not a list');
    assert.equal(findListLead(c, 99), undefined);
  });

  it('never sees another account’s rows after sign-out or account switch', async () => {
    const c = newClient();
    seedLists(c);
    // useAccountQueryCache: sign-out → clear(); switch → resetQueries().
    await c.resetQueries();
    assert.equal(findListLead(c, 1), undefined);
    seedLists(c);
    c.clear();
    assert.equal(findListLead(c, 1), undefined);
  });
});

describe('placeholder from the list row', () => {
  it('renders the row at once but never stores it as the detail', async () => {
    const c = newClient();
    seedLists(c);
    const fetched = deferred();
    const observer = new QueryObserver(c, {
      queryKey: leadDetailKey(1),
      queryFn: () => fetched.promise,
      placeholderData: () => findListLead(c, 1),
    });
    const results = [];
    const unsubscribe = observer.subscribe((r) => results.push(r));

    const first = observer.getCurrentResult();
    assert.equal(first.isPlaceholderData, true);
    assert.equal(first.data.buyerPersona.fullName, 'Lead 1');
    assert.equal(c.getQueryData(leadDetailKey(1)), undefined);

    fetched.resolve(detail(1, '2026-11-01T10:00:00Z'));
    await fetched.promise;
    await new Promise((r) => setTimeout(r, 0));
    const last = observer.getCurrentResult();
    assert.equal(last.isPlaceholderData, false);
    assert.equal(last.data.version, 4);
    assert.equal(c.getQueryData(leadDetailKey(1)).notes.length, 1);
    unsubscribe();
  });
});

describe('request handling', () => {
  it('a touch-down prefetch and the screen share one request', async () => {
    const c = newClient();
    let calls = 0;
    const options = {
      queryKey: leadDetailKey(5),
      queryFn: async () => {
        calls += 1;
        return detail(5, '2026-11-01T10:00:00Z');
      },
      staleTime: 30_000,
    };
    const prefetch = c.prefetchQuery(options);
    const screen = c.fetchQuery(options);
    await Promise.all([prefetch, screen]);
    // Reopening within staleTime is served from cache.
    await c.fetchQuery(options);
    assert.equal(calls, 1);
  });

  it('a late response for lead A cannot land on lead B', async () => {
    const c = newClient();
    const a = deferred();
    const b = deferred();
    const fetchA = c.fetchQuery({ queryKey: leadDetailKey(10), queryFn: () => a.promise });
    const fetchB = c.fetchQuery({ queryKey: leadDetailKey(11), queryFn: () => b.promise });
    b.resolve(detail(11, '2026-11-01T10:00:00Z'));
    a.resolve(detail(10, '2026-11-01T09:00:00Z'));
    await Promise.all([fetchA, fetchB]);
    assert.equal(c.getQueryData(leadDetailKey(10)).id, 10);
    assert.equal(c.getQueryData(leadDetailKey(11)).id, 11);
  });

  it('leaving the screen aborts the in-flight request', async () => {
    const c = newClient();
    let signal;
    const observer = new QueryObserver(c, {
      queryKey: leadDetailKey(7),
      queryFn: ({ signal: s }) => {
        signal = s;
        return new Promise(() => {});
      },
    });
    const unsubscribe = observer.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(signal.aborted, false);
    unsubscribe();
    assert.equal(signal.aborted, true);
  });
});

describe('markOutdatedLeadDetails', () => {
  it('marks a cached detail stale when the list shows a newer edit, without fetching', () => {
    const c = newClient();
    let calls = 0;
    c.setQueryDefaults(leadDetailKey(1), {
      queryFn: () => {
        calls += 1;
        return detail(1, '2026-11-03T00:00:00Z');
      },
    });
    c.setQueryData(leadDetailKey(1), detail(1, '2026-11-01T10:00:00Z'));
    markOutdatedLeadDetails(c, [row(1, '2026-11-02T12:00:00Z')]);
    assert.equal(c.getQueryState(leadDetailKey(1)).isInvalidated, true);
    assert.equal(calls, 0);
  });

  it('leaves current, newer and missing details alone', () => {
    const c = newClient();
    c.setQueryData(leadDetailKey(1), detail(1, '2026-11-01T10:00:00Z'));
    c.setQueryData(leadDetailKey(2), detail(2, '2026-11-05T10:00:00Z'));
    markOutdatedLeadDetails(c, [
      row(1, '2026-11-01T10:00:00Z'),
      row(2, '2026-11-02T10:00:00Z'),
      row(4, '2026-11-09T10:00:00Z'),
    ]);
    assert.equal(c.getQueryState(leadDetailKey(1)).isInvalidated, false);
    assert.equal(c.getQueryState(leadDetailKey(2)).isInvalidated, false);
    assert.equal(c.getQueryState(leadDetailKey(4)), undefined);
  });

  it('a "not found" detail is re-checked once the lead shows up in a list again', () => {
    const c = newClient();
    c.setQueryData(leadDetailKey(3), null); // was 404 (e.g. reassigned away)
    markOutdatedLeadDetails(c, [row(3, '2026-11-01T10:00:00Z')]);
    assert.equal(c.getQueryState(leadDetailKey(3)).isInvalidated, true);
  });
});

const httpError = (status) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', {}, {}, {
    status,
    statusText: '',
    headers: {},
    config: {},
    data: {},
  });

describe('detailOrNull (404 → null)', () => {
  it('passes a detail through', async () => {
    assert.deepEqual(await detailOrNull(Promise.resolve({ id: 1 })), { id: 1 });
  });

  it('maps 404 to null, so a reassigned lead replaces its cached copy', async () => {
    const c = newClient();
    c.setQueryData(leadDetailKey(9), detail(9, '2026-11-01T10:00:00Z'));
    await c.fetchQuery({
      queryKey: leadDetailKey(9),
      queryFn: () => detailOrNull(Promise.reject(httpError(404))),
    });
    assert.equal(c.getQueryData(leadDetailKey(9)), null);
  });

  it('keeps every other failure an error (401, 403, 500, network)', async () => {
    for (const error of [
      httpError(401),
      httpError(403),
      httpError(500),
      new AxiosError('Network Error', 'ERR_NETWORK'),
      new Error('boom'),
    ]) {
      await assert.rejects(detailOrNull(Promise.reject(error)), (e) => e === error);
    }
  });
});

describe('account switch with a request in flight', () => {
  // useAccountQueryCache: switch → resetQueries(), sign-out → clear().
  for (const [label, swap] of [
    ['switch (resetQueries)', (c) => c.resetQueries()],
    ['sign-out (clear)', (c) => c.clear()],
  ]) {
    it(`${label}: the late response of account A is dropped and its request aborted`, async () => {
      const c = newClient();
      const response = deferred();
      let signal;
      const observer = new QueryObserver(c, {
        queryKey: leadDetailKey(21),
        queryFn: ({ signal: s }) => {
          signal = s;
          return response.promise;
        },
      });
      const unsubscribe = observer.subscribe(() => {});
      await new Promise((r) => setTimeout(r, 0));
      await swap(c);
      assert.equal(signal.aborted, true);
      response.resolve(detail(21, '2026-11-01T10:00:00Z', { owner: 'A' }));
      await response.promise;
      await new Promise((r) => setTimeout(r, 0));
      const data = c.getQueryData(leadDetailKey(21));
      assert.notEqual(data?.owner, 'A');
      unsubscribe();
    });
  }
});
