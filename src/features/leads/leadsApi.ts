import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '@/api/client';
import {
  detailOrNull,
  leadDetailKey,
} from '@/features/leads/leadDetailCache';
import type {
  ApiResponse,
  LeadDetail,
  LeadListItem,
  LeadMeta,
  LeadStatus,
  LeadViewHistory,
} from '@/types/api';

export type LeadListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  leadStatusId?: number | string;
  followupOverdue?: boolean;
  followupFrom?: string;
  followupTo?: string;
  /** false → Unread (nobody has opened the lead yet). */
  viewed?: boolean;
};

export async function fetchMyLeads(params: LeadListParams = {}) {
  const { data } = await api.get<
    ApiResponse<LeadListItem[] | { data: LeadListItem[]; meta?: Record<string, number> }>
  >('/crm/leads', {
    params: {
      mine: true,
      // Only the fields a list row renders (server skips heavy relations).
      view: 'compact',
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      search: params.search || undefined,
      leadStatusId: params.leadStatusId || undefined,
      followupOverdue: params.followupOverdue || undefined,
      followupFrom: params.followupFrom || undefined,
      followupTo: params.followupTo || undefined,
      viewed: params.viewed ?? undefined,
    },
  });
  const payload = data.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const meta =
    data.meta ??
    (!Array.isArray(payload) && payload?.meta ? payload.meta : {}) ??
    {};
  return { items, meta };
}

/** Pins a request to one account (see AxiosRequestConfig.accountId). */
type WriteOptions = { accountId?: string };

export async function fetchLeadById(
  id: number | string,
  options: WriteOptions & { signal?: AbortSignal } = {}
) {
  const { data } = await api.get<ApiResponse<LeadDetail>>(`/crm/leads/${id}`, {
    // Lean mobile payload — avoids admin `full` graph that 500s for some leads.
    params: { view: 'mobile' },
    accountId: options.accountId,
    signal: options.signal,
  });
  return data.data;
}

/**
 * Cached detail renders at once; a refetch runs in the background once it is
 * older than this. Short, because other employees edit leads too — list
 * refreshes and this device's writes also mark it stale (leadDetailCache.ts).
 */
const LEAD_DETAIL_STALE_MS = 30_000;

export const leadDetailQuery = (leadId: number) =>
  queryOptions({
    queryKey: leadDetailKey(leadId),
    // The signal cancels the request when every screen showing it is gone.
    // Deleted / no longer visible → null (see detailOrNull).
    queryFn: ({ signal }) => detailOrNull(fetchLeadById(leadId, { signal })),
    staleTime: LEAD_DETAIL_STALE_MS,
    enabled: Number.isFinite(leadId),
  });

export async function updateLeadStatus(
  id: number | string,
  payload: Record<string, unknown> & {
    leadStatusId?: number;
    expectedVersion?: number;
  },
  options: WriteOptions = {}
) {
  const { data } = await api.put<ApiResponse<LeadDetail>>(
    `/crm/leads/${id}`,
    payload,
    { accountId: options.accountId }
  );
  return data.data;
}

/** Generic lead PUT (priority, stageRating, full status change, …). */
export async function updateLead(
  id: number | string,
  payload: Record<string, unknown>,
  options: WriteOptions = {}
) {
  const { data } = await api.put<ApiResponse<LeadDetail>>(
    `/crm/leads/${id}`,
    payload,
    { accountId: options.accountId }
  );
  return data.data;
}

export async function updateLeadPriority(
  id: number | string,
  payload: {
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedVersion?: number;
  },
  options: WriteOptions = {}
) {
  const { data } = await api.put<ApiResponse<LeadDetail>>(
    `/crm/leads/${id}`,
    payload,
    { accountId: options.accountId }
  );
  return data.data;
}

export async function addLeadNote(
  id: number | string,
  payload: {
    note: string;
    channelId?: number;
    followupAt?: string;
    followupDate?: string;
    followupType?: string;
    reminderMinutes?: number;
    completeFollowup?: boolean;
  },
  options: WriteOptions & {
    /** Same key on every retry → the server creates the note only once. */
    idempotencyKey?: string;
  } = {}
) {
  const { data } = await api.post(`/crm/leads/${id}/notes`, payload, {
    accountId: options.accountId,
    headers: options.idempotencyKey
      ? { 'Idempotency-Key': options.idempotencyKey }
      : undefined,
  });
  return data.data;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { data?: unknown }).data)
  ) {
    return (value as { data: T[] }).data;
  }
  return [];
}

export async function fetchLeadStatuses() {
  // select=true returns a plain ACTIVE status array (not paginated { data, meta }).
  const { data } = await api.get<ApiResponse<LeadStatus[] | { data: LeadStatus[] }>>(
    '/crm/lead-statuses',
    { params: { select: true } }
  );
  return asArray<LeadStatus>(data.data);
}

export async function fetchNoteChannels() {
  const { data } = await api.get<
    ApiResponse<
      | Array<{ id: number; name: string; status?: string }>
      | { data: Array<{ id: number; name: string; status?: string }> }
    >
  >('/crm/note-channels', { params: { select: true } });
  return asArray<{ id: number; name: string; status?: string }>(data.data).filter(
    (c) => !c.status || String(c.status).toUpperCase() === 'ACTIVE'
  );
}

/** Option key → label maps for Lead Entry fields (same meta web portal uses). */
export async function fetchLeadMeta() {
  const { data } = await api.get<ApiResponse<LeadMeta>>('/crm/lead-options/meta');
  return data.data;
}

/** Admin-managed lookups — change rarely, so keep them fresh for a while. */
const LOOKUP_STALE_MS = 10 * 60_000;

export const leadStatusesQuery = queryOptions({
  queryKey: ['lead-statuses'],
  queryFn: fetchLeadStatuses,
  staleTime: LOOKUP_STALE_MS,
});

export const noteChannelsQuery = queryOptions({
  queryKey: ['note-channels'],
  queryFn: fetchNoteChannels,
  staleTime: LOOKUP_STALE_MS,
});

export const leadMetaQuery = queryOptions({
  queryKey: ['lead-meta'],
  queryFn: fetchLeadMeta,
  staleTime: LOOKUP_STALE_MS,
});

export async function fetchLeadViews(leadId: number | string, limit = 30) {
  const { data } = await api.get<ApiResponse<LeadViewHistory>>(
    `/crm/leads/${leadId}/views`,
    { params: { limit } }
  );
  return data.data;
}

/** Record a visit so View History matches the web portal. */
export async function startLeadView(leadId: number | string) {
  const { data } = await api.post<ApiResponse<{ id: number }>>(
    `/crm/leads/${leadId}/views`
  );
  return data.data;
}

export const leadViewsQuery = (leadId: number) =>
  queryOptions({
    queryKey: ['lead-views', leadId],
    queryFn: () => fetchLeadViews(leadId),
    enabled: Number.isFinite(leadId),
  });

/** Lead list tab — All, Unread, or one lead status id. */
export type LeadListTab = 'all' | 'unread' | number;

export const myLeadsQuery = (search: string, tab: LeadListTab = 'all') =>
  infiniteQueryOptions({
    // Tab before search so ['my-leads', 'unread'] matches every search.
    queryKey: ['my-leads', tab, search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchMyLeads({
        page: pageParam,
        search,
        leadStatusId: typeof tab === 'number' ? tab : undefined,
        viewed: tab === 'unread' ? false : undefined,
      }),
    getNextPageParam: (last) => {
      const current = last.meta.current_page ?? last.meta.page ?? 1;
      const lastPage = last.meta.last_page ?? last.meta.totalPages ?? current;
      return current < lastPage ? current + 1 : undefined;
    },
  });

type StatusCounts = {
  total: number;
  byStatus: { leadStatusId: number | null; count: number }[];
};

async function fetchStatusCounts(params: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<StatusCounts>>(
    '/crm/leads/status-counts',
    { params: { mine: true, ...params } }
  );
  return data.data;
}

export type LeadTabCounts = {
  all: number;
  unread: number;
  byStatus: Record<number, number>;
};

/** Badge counts for the lead list tabs (same search as the list). */
export const leadTabCountsQuery = (search: string) =>
  queryOptions({
    // Under 'my-leads' so every list invalidation refreshes the badges too.
    queryKey: ['my-leads', 'counts', search],
    queryFn: async (): Promise<LeadTabCounts> => {
      const q = search || undefined;
      const [all, unread] = await Promise.all([
        fetchStatusCounts({ search: q }),
        fetchStatusCounts({ search: q, viewed: false }),
      ]);
      const byStatus: Record<number, number> = {};
      for (const row of all.byStatus) {
        if (row.leadStatusId != null) byStatus[row.leadStatusId] = row.count;
      }
      return { all: all.total, unread: unread.total, byStatus };
    },
  });

export async function fetchLeadSources() {
  const { data } = await api.get<
    ApiResponse<{ id: number; name: string }[] | { data: { id: number; name: string }[] }>
  >('/crm/lead-sources', { params: { select: true } });
  return asArray<{ id: number; name: string }>(data.data);
}

export const leadSourcesQuery = queryOptions({
  queryKey: ['lead-sources'],
  queryFn: fetchLeadSources,
  staleTime: LOOKUP_STALE_MS,
});

/** Existing leads with this phone (duplicate warning before create). */
export async function checkLeadPhone(phone: string) {
  const { data } = await api.get<
    ApiResponse<{ phone: string | null; matches: { id: number }[] }>
  >('/crm/leads/check-phone', { params: { phone } });
  return data.data?.matches ?? [];
}

export async function createLead(
  payload: {
    fullName: string;
    phone: string;
    leadSourceId: number;
    email?: string | null;
    inquiryNote?: string | null;
  },
  options: { idempotencyKey?: string } = {}
) {
  const { data } = await api.post<ApiResponse<LeadDetail>>(
    '/crm/leads',
    // Created from My Leads — the server assigns it to the requester.
    { ...payload, assignToMe: true },
    {
      headers: options.idempotencyKey
        ? { 'Idempotency-Key': options.idempotencyKey }
        : undefined,
    }
  );
  return data.data;
}

/** Month key for the follow-up calendar — `yyyy-MM`, local time. */
export function followUpMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The server caps a page at 100 rows; a month rarely needs more than one. */
const FOLLOW_UP_MONTH_MAX_PAGES = 5;

/** Every lead of mine with a follow-up due in `month` (`yyyy-MM`, local time). */
export const followUpMonthQuery = (month: string) =>
  queryOptions({
    queryKey: ['follow-up-leads', 'month', month],
    queryFn: async () => {
      const [year, monthNo] = month.split('-').map(Number);
      const from = new Date(year, monthNo - 1, 1).toISOString();
      const to = new Date(year, monthNo, 0, 23, 59, 59, 999).toISOString();
      const items: LeadListItem[] = [];
      for (let page = 1; page <= FOLLOW_UP_MONTH_MAX_PAGES; page++) {
        const res = await fetchMyLeads({
          followupFrom: from,
          followupTo: to,
          page,
          per_page: 100,
        });
        items.push(...res.items);
        const lastPage = res.meta.last_page ?? res.meta.totalPages ?? page;
        if (page >= lastPage) break;
      }
      return { items };
    },
  });
