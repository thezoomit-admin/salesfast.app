import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import type { LeadDetail, LeadListItem } from '@/types/api';

/**
 * How the lead detail cache relates to the lead lists. No React Native
 * imports, so it runs under `node --test` (see leadDetailCache.test.mjs).
 *
 * Every key here lives in the signed-in account's cache only:
 * useAccountQueryCache resets / clears the client on account switch and
 * sign-out, and the disk copy is one file per account.
 */
export const leadDetailKey = (leadId: number) => ['lead', leadId] as const;

/**
 * A 404 means the lead was deleted or is no longer visible to this account
 * (e.g. reassigned): resolve to null so it replaces any cached copy, which
 * then stops being shown or saved. Every other failure stays an error.
 */
export async function detailOrNull(
  request: Promise<LeadDetail>
): Promise<LeadDetail | null> {
  try {
    return await request;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

type ListPage = { items: LeadListItem[] };

/** List caches whose rows are LeadListItem (Leads tab, Follow-ups tab). */
const LIST_ROOTS = ['my-leads', 'follow-up-leads'] as const;

function rowsOf(data: unknown): LeadListItem[] {
  if (!data || typeof data !== 'object') return [];
  const pages = (data as Partial<InfiniteData<ListPage>>).pages;
  if (Array.isArray(pages)) return pages.flatMap((p) => p?.items ?? []);
  const items = (data as Partial<ListPage>).items;
  return Array.isArray(items) ? items : [];
}

/**
 * The row the user just tapped, from any loaded list. Shown as placeholder
 * data only: it is never written to the detail cache, and the screen treats
 * every detail-only field as "not loaded yet" while it is on screen.
 */
export function findListLead(
  client: QueryClient,
  leadId: number
): LeadListItem | undefined {
  let newest: LeadListItem | undefined;
  for (const root of LIST_ROOTS) {
    for (const [, data] of client.getQueriesData({ queryKey: [root] })) {
      for (const row of rowsOf(data)) {
        if (row.id !== leadId) continue;
        if (!newest || isNewer(row.updatedAt, newest.updatedAt)) newest = row;
      }
    }
  }
  return newest;
}

function isNewer(a: string | undefined, b: string | undefined) {
  if (!a) return false;
  if (!b) return true;
  return Date.parse(a) > Date.parse(b);
}

/**
 * A list refresh can reveal that a lead changed (e.g. another employee moved
 * it) after its detail was cached, or that a lead cached as "not found" is
 * visible again (reassigned back). Mark those details stale so the next open
 * refetches instead of trusting the old copy for the rest of its staleTime.
 * Nothing is fetched here.
 */
export function markOutdatedLeadDetails(
  client: QueryClient,
  rows: readonly LeadListItem[]
) {
  for (const row of rows) {
    const key = leadDetailKey(row.id);
    const state = client.getQueryState<LeadDetail | null>(key);
    if (!state || state.data === undefined || state.isInvalidated) continue;
    if (state.data === null || isNewer(row.updatedAt, state.data.updatedAt)) {
      void client.invalidateQueries({
        queryKey: key,
        exact: true,
        refetchType: 'none',
      });
    }
  }
}
