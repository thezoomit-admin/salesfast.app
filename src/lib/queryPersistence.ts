import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Mutation,
  type Query,
  type QueryClient,
} from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

/**
 * Disk copy of the React Query cache so screens paint saved data on a cold
 * start (and offline) while the network refresh runs in the background.
 *
 * - One file per signed-in account; it is only ever loaded for that account.
 * - Lives in the app's private documents dir (not shared with other apps).
 *   Tokens are never in the query cache — they stay in SecureStore.
 * - Bump CACHE_VERSION whenever a cached API response shape changes.
 */
const CACHE_VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const WRITE_THROTTLE_MS = 1_500;
/** Lead detail payloads are large — keep only the most recently viewed. */
const MAX_LEAD_DETAILS = 30;

/** Query roots worth keeping across restarts. Device call log is excluded (Date objects, local-only). */
const PERSISTED_ROOTS = new Set([
  'mobile-dashboard',
  'my-leads',
  'follow-up-leads',
  'lead',
  'lead-statuses',
  'note-channels',
  'notifications',
]);

type PersistedCache = {
  version: number;
  userId: string;
  savedAt: number;
  state: DehydratedState;
};

const supported = Platform.OS !== 'web';

/** Stop functions of running persisters, so a delete can't be undone by a pending write. */
const activePersisters = new Map<string, () => void>();

function cacheFile(userId: string) {
  return new File(
    Paths.document,
    `query-cache-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
  );
}

function shouldPersist(query: Query) {
  return (
    query.state.status === 'success' &&
    PERSISTED_ROOTS.has(String(query.queryKey[0]))
  );
}

/**
 * Offline writes: mutations declared with `meta: { offline: true }` whose
 * variables carry the `accountId` that made them. Saved in their own file,
 * which outlives sign-out — they are the user's unsent work, replayed at that
 * account's next sign-in. Only removing the account from the device drops them.
 */
type OfflineWriteVars = { accountId?: string; clientId?: string };

function pendingFile(userId: string) {
  return new File(
    Paths.document,
    `pending-writes-${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
  );
}

function isOfflineWrite(mutation: Mutation<any, any, any, any>) {
  return mutation.meta?.offline === true;
}

function offlineVars(mutation: Mutation<any, any, any, any>) {
  return (mutation.state.variables ?? {}) as OfflineWriteVars;
}

function writePendingWrites(client: QueryClient, userId: string) {
  const state = dehydrate(client, {
    shouldDehydrateQuery: () => false,
    shouldDehydrateMutation: (m) =>
      isOfflineWrite(m) &&
      m.state.status === 'pending' &&
      offlineVars(m).accountId === userId,
  });
  const file = pendingFile(userId);
  if (!state.mutations.length) {
    if (file.exists) file.delete();
    return;
  }
  // Restored writes must resume, including ones that were mid-request.
  const mutations = state.mutations.map((m) => ({
    ...m,
    state: { ...m.state, isPaused: true },
  }));
  if (!file.exists) file.create();
  file.write(JSON.stringify({ version: CACHE_VERSION, userId, mutations }));
}

/** Loads the account's unsent writes and starts sending them (or waits for the network). */
export async function restorePendingWrites(client: QueryClient, userId: string) {
  if (!supported) return;
  try {
    const file = pendingFile(userId);
    if (!file.exists) return;
    const saved = JSON.parse(await file.text()) as {
      userId: string;
      mutations: DehydratedState['mutations'];
    };
    if (saved.userId !== userId) return;

    const cache = client.getMutationCache();
    // Writes still in memory (e.g. waiting while another account was active)
    // must not be queued twice.
    const inMemory = new Set(
      cache.getAll().filter(isOfflineWrite).map((m) => offlineVars(m).clientId)
    );
    const fresh = saved.mutations.filter((m) => {
      const vars = (m.state.variables ?? {}) as OfflineWriteVars;
      return vars.accountId === userId && !inMemory.has(vars.clientId);
    });
    if (!fresh.length) return;

    hydrate(client, { mutations: fresh, queries: [] });
    const restored = new Set(
      fresh.map((m) => (m.state.variables as OfflineWriteVars).clientId)
    );
    for (const mutation of cache.getAll()) {
      if (isOfflineWrite(mutation) && restored.has(offlineVars(mutation).clientId)) {
        void mutation.continue().catch(() => undefined);
      }
    }
  } catch {
    // Corrupt file — nothing we can safely replay.
  }
}

/** Drops an account's unsent writes (account removed from this device). */
export function deletePendingWrites(userId: string | null | undefined) {
  if (!supported || !userId) return;
  try {
    const file = pendingFile(userId);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

function snapshot(client: QueryClient, userId: string): PersistedCache {
  const state = dehydrate(client, { shouldDehydrateQuery: shouldPersist });
  const details = state.queries
    .filter((q) => q.queryKey[0] === 'lead')
    .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
    .slice(MAX_LEAD_DETAILS);
  const dropped = new Set(details.map((q) => q.queryHash));
  return {
    version: CACHE_VERSION,
    userId,
    savedAt: Date.now(),
    state: {
      ...state,
      queries: state.queries.filter((q) => !dropped.has(q.queryHash)),
    },
  };
}

/**
 * Loads the account's saved cache into the client. `hydrate` never replaces a
 * query that already holds newer data, so a fast network response wins.
 */
export async function restoreQueryCache(client: QueryClient, userId: string) {
  if (!supported) return;
  try {
    const file = cacheFile(userId);
    if (!file.exists) return;
    const saved = JSON.parse(await file.text()) as PersistedCache;
    if (
      saved.version !== CACHE_VERSION ||
      saved.userId !== userId ||
      Date.now() - saved.savedAt > MAX_AGE_MS
    ) {
      file.delete();
      return;
    }
    hydrate(client, saved.state);
  } catch {
    // Corrupt / unreadable cache — start cold.
  }
}

/** Writes the cache to disk after successful fetches. Returns a stop function. */
export function persistQueryCache(client: QueryClient, userId: string) {
  if (!supported) return () => undefined;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const write = () => {
    timer = null;
    if (stopped) return;
    try {
      const file = cacheFile(userId);
      if (!file.exists) file.create();
      file.write(JSON.stringify(snapshot(client, userId)));
    } catch {
      // Disk full / IO error — the in-memory cache still works.
    }
  };

  const schedule = () => {
    if (!timer && !stopped) timer = setTimeout(write, WRITE_THROTTLE_MS);
  };

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (
      event.type === 'updated' &&
      event.action.type === 'success' &&
      shouldPersist(event.query)
    ) {
      schedule();
    }
  });

  // Unsent writes are saved right away (not throttled): they are the one
  // thing in here that cannot be fetched again.
  const savePending = () => {
    try {
      writePendingWrites(client, userId);
    } catch {
      // IO error — the write is still queued in memory.
    }
  };
  const unsubscribeMutations = client.getMutationCache().subscribe((event) => {
    if (stopped || !event.mutation || !isOfflineWrite(event.mutation)) return;
    if (offlineVars(event.mutation).accountId !== userId) return;
    if (event.type === 'added' || event.type === 'removed' || event.type === 'updated') {
      savePending();
    }
  });

  // Flush before the OS can kill a backgrounded app.
  const appSub = AppState.addEventListener('change', (state) => {
    if (state !== 'active' && timer) {
      clearTimeout(timer);
      write();
    }
  });

  const stop = () => {
    if (stopped) return;
    if (timer) {
      clearTimeout(timer);
      write();
    }
    savePending();
    stopped = true;
    unsubscribe();
    unsubscribeMutations();
    appSub.remove();
    if (activePersisters.get(userId) === stop) activePersisters.delete(userId);
  };
  activePersisters.get(userId)?.();
  activePersisters.set(userId, stop);
  return stop;
}

/** Removes an account's saved cache (sign-out, session lost, account removed). */
export function deleteQueryCache(userId: string | null | undefined) {
  if (!supported || !userId) return;
  activePersisters.get(userId)?.();
  try {
    const file = cacheFile(userId);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}
