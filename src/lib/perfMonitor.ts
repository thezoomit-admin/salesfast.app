import type { QueryClient } from '@tanstack/react-query';

/**
 * Dev-only performance counters (no-ops in release builds).
 *
 * - API: per-request latency + request count per endpoint.
 * - Cache: a screen mounting a query that already has data is a hit;
 *   mounting one with no data (spinner/skeleton) is a miss.
 * - First content: ms from JS start until a screen first has data,
 *   and whether that data came from cache or the network.
 * - Lead open: milestones from a lead row tap to fresh detail data.
 *
 * Call `logPerfSummary()` from the debugger console, or watch Metro logs.
 */
const enabled = __DEV__;
const jsStart = Date.now();

const apiCounts = new Map<string, { count: number; totalMs: number }>();
let cacheHits = 0;
let cacheMisses = 0;
const firstContent = new Set<string>();

function endpointKey(method: string | undefined, url: string | undefined) {
  // Collapse ids so /crm/leads/123 and /crm/leads/456 count together.
  const path = String(url ?? '').replace(/\/\d+(?=\/|$)/g, '/:id');
  return `${String(method ?? 'get').toUpperCase()} ${path}`;
}

export function recordApiTiming(
  method: string | undefined,
  url: string | undefined,
  status: number | string,
  ms: number
) {
  if (!enabled) return;
  const key = endpointKey(method, url);
  const row = apiCounts.get(key) ?? { count: 0, totalMs: 0 };
  row.count += 1;
  row.totalMs += ms;
  apiCounts.set(key, row);
  console.log(`[api] ${key} ${status} ${Math.round(ms)}ms`);
}

export function markFirstContent(screen: string, fromCache: boolean) {
  if (!enabled || firstContent.has(screen)) return;
  firstContent.add(screen);
  console.log(
    `[perf] ${screen} first content at +${Date.now() - jsStart}ms (${fromCache ? 'cache' : 'network'})`
  );
}

/**
 * Lead open trace, in ms after the row tap: `mount` (screen rendered),
 * `content` (first lead data on screen, and whether it was the list row,
 * the cache or the network), `details` (full detail on screen), `fresh`
 * (this open's server response landed) or `refresh failed`.
 */
const leadTaps = new Map<number, number>();

export function markLeadTap(leadId: number) {
  if (enabled) leadTaps.set(leadId, Date.now());
}

export function markLeadOpen(leadId: number, stage: string) {
  if (!enabled) return;
  const tap = leadTaps.get(leadId);
  console.log(
    `[perf] lead ${leadId} ${stage}${tap ? ` +${Date.now() - tap}ms after tap` : ''}`
  );
}

export function installQueryCacheMonitor(client: QueryClient) {
  if (!enabled) return () => undefined;
  return client.getQueryCache().subscribe((event) => {
    if (event.type !== 'observerAdded') return;
    if (event.query.state.data !== undefined) cacheHits += 1;
    else cacheMisses += 1;
  });
}

export function logPerfSummary() {
  if (!enabled) return;
  const total = cacheHits + cacheMisses;
  console.log(
    `[perf] cache hit rate ${total ? Math.round((cacheHits / total) * 100) : 0}% (${cacheHits}/${total})`
  );
  for (const [key, row] of [...apiCounts].sort((a, b) => b[1].count - a[1].count)) {
    console.log(
      `[perf] ${key} ×${row.count} avg ${Math.round(row.totalMs / row.count)}ms`
    );
  }
}

if (enabled) {
  (globalThis as { logPerfSummary?: () => void }).logPerfSummary = logPerfSummary;
}
