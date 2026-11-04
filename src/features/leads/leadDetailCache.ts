import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import type { LeadDetail, LeadListItem, MyFollowUp } from '@/types/api';

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

/** List caches whose rows are LeadListItem (Leads tab). */
const LIST_ROOTS = ['my-leads'] as const;

/** Follow-ups tab cache — rows are follow-ups that carry a lead summary. */
const FOLLOW_UP_ROOT = 'my-follow-ups';

/** The lead summary on a follow-up row, as a list row (placeholder, staleness). */
export function leadRowOfFollowUp(f: MyFollowUp): LeadListItem {
  return {
    id: f.lead.id,
    buyerPersona: { fullName: f.lead.name, phone: f.lead.phone },
    leadStatus: f.lead.status,
    priority: f.lead.priority,
    updatedAt: f.lead.updatedAt,
  };
}

function followUpLeadRows(data: unknown): LeadListItem[] {
  const list = data as { items?: unknown; pages?: { items?: unknown[] }[] } | null;
  // Month caches hold `items`; the Overdue / Upcoming lists hold `pages`.
  const items = list?.pages ? list.pages.flatMap((p) => p?.items ?? []) : list?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((f): f is MyFollowUp => !!f && typeof f === 'object' && !!(f as MyFollowUp).lead)
    .map(leadRowOfFollowUp);
}

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
  const consider = (row: LeadListItem) => {
    if (row.id !== leadId) return;
    if (!newest || isNewer(row.updatedAt, newest.updatedAt)) newest = row;
  };
  for (const root of LIST_ROOTS) {
    for (const [, data] of client.getQueriesData({ queryKey: [root] })) {
      rowsOf(data).forEach(consider);
    }
  }
  for (const [, data] of client.getQueriesData({ queryKey: [FOLLOW_UP_ROOT] })) {
    followUpLeadRows(data).forEach(consider);
  }
  return newest;
}

function isNewer(a: string | undefined, b: string | undefined) {
  if (!a) return false;
  if (!b) return true;
  return Date.parse(a) > Date.parse(b);
}

function mapListData(
  data: unknown,
  mapRow: (row: LeadListItem) => LeadListItem
): unknown {
  if (!data || typeof data !== 'object') return data;

  const infinite = data as Partial<InfiniteData<ListPage>>;
  if (Array.isArray(infinite.pages)) {
    let changed = false;
    const pages = infinite.pages.map((page) => {
      if (!page?.items) return page;
      let pageChanged = false;
      const items = page.items.map((row) => {
        const next = mapRow(row);
        if (next !== row) pageChanged = true;
        return next;
      });
      if (!pageChanged) return page;
      changed = true;
      return { ...page, items };
    });
    return changed ? { ...infinite, pages } : data;
  }

  const list = data as Partial<ListPage>;
  if (Array.isArray(list.items)) {
    let changed = false;
    const items = list.items.map((row) => {
      const next = mapRow(row);
      if (next !== row) changed = true;
      return next;
    });
    return changed ? { ...list, items } : data;
  }

  return data;
}

/**
 * Patch a lead row across the loaded Leads list caches. Follow-up rows are
 * not lead rows; they refetch after any lead write.
 * Used so detail edits (e.g. priority) show immediately when navigating back
 * without waiting for a full list refetch.
 */
export function patchLeadInLists(
  client: QueryClient,
  leadId: number,
  patch: Partial<LeadListItem>
) {
  for (const root of LIST_ROOTS) {
    for (const [key, data] of client.getQueriesData({ queryKey: [root] })) {
      const next = mapListData(data, (row) =>
        row.id === leadId ? { ...row, ...patch } : row
      );
      if (next !== data) client.setQueryData(key, next);
    }
  }
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
