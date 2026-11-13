import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { LeadListMode } from '@/features/auth/leadAccess';
import {
  detailOrNull,
  leadDetailKey,
} from '@/features/leads/leadDetailCache';
import {
  NO_LEAD_FILTERS,
  leadFilterParams,
  type LeadFilterParams,
  type LeadFilters,
} from '@/features/leads/leadFilters';
import type {
  ApiResponse,
  FollowUpOutcome,
  LeadDetail,
  LeadListItem,
  LeadMeta,
  LeadStatus,
  LeadViewHistory,
  MyFollowUp,
} from '@/types/api';

export type LeadListParams = LeadFilterParams & {
  page?: number;
  per_page?: number;
  search?: string;
  leadStatusId?: number | string;
  followupOverdue?: boolean;
  followupFrom?: string;
  followupTo?: string;
  /** false → Unread (nobody has opened the lead yet). */
  viewed?: boolean;
  /**
   * My Leads → true (assigned to the JWT user).
   * All Leads → omit/false (server still applies canViewAll scope).
   */
  mine?: boolean;
};

export async function fetchLeads(params: LeadListParams = {}) {
  const { data } = await api.get<
    ApiResponse<LeadListItem[] | { data: LeadListItem[]; meta?: Record<string, number> }>
  >('/crm/leads', {
    params: {
      view: 'compact',
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      search: params.search || undefined,
      leadStatusId: params.leadStatusId || undefined,
      followupOverdue: params.followupOverdue || undefined,
      followupFrom: params.followupFrom || undefined,
      followupTo: params.followupTo || undefined,
      viewed: params.viewed ?? undefined,
      followupNone: params.followupNone || undefined,
      sort: params.sort,
      temperature: params.temperature ?? params.priority,
      leadSourceId: params.leadSourceId,
      engagement: params.engagement,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      ...(params.mine ? { mine: true } : {}),
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

/** @deprecated Prefer fetchLeads({ mine: true }) for My Leads. */
export async function fetchMyLeads(params: LeadListParams = {}) {
  return fetchLeads({ ...params, mine: true });
}

/** Root query key for both My Leads and All Leads list caches. */
export const LEADS_QUERY_ROOT = 'leads' as const;

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

/** Generic lead PUT (temperature, stageRating, full status change, …). */
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

export async function updateLeadTemperature(
  id: number | string,
  payload: {
    temperature: 'COLD' | 'WARM' | 'HOT';
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

/** @deprecated Use updateLeadTemperature */
export async function updateLeadPriority(
  id: number | string,
  payload: {
    priority?: 'COLD' | 'WARM' | 'HOT' | 'LOW' | 'MEDIUM' | 'HIGH';
    temperature?: 'COLD' | 'WARM' | 'HOT';
    expectedVersion?: number;
  },
  options: WriteOptions = {}
) {
  return updateLeadTemperature(
    id,
    {
      temperature: (payload.temperature ??
        (payload.priority === 'LOW'
          ? 'COLD'
          : payload.priority === 'MEDIUM'
            ? 'WARM'
            : payload.priority === 'HIGH'
              ? 'HOT'
              : payload.priority)) as 'COLD' | 'WARM' | 'HOT',
      expectedVersion: payload.expectedVersion,
    },
    options
  );
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
    /** Mark the open follow-up done with this note, whatever the channel. */
    completeFollowup?: boolean;
    outcome?: FollowUpOutcome;
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

// Name fallback until every server sends `code`.
export const isDraftStatus = (s: LeadStatus) =>
  s.code === 'DRAFT' || /^draft$/i.test(s.name.trim());

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

export const leadsListQuery = (
  mode: LeadListMode,
  search: string,
  tab: LeadListTab = 'all',
  filters: LeadFilters = NO_LEAD_FILTERS
) =>
  infiniteQueryOptions({
    // Mode + tab before search so ['leads', 'mine', 'unread'] matches every search.
    queryKey: [LEADS_QUERY_ROOT, mode, tab, search, filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchLeads({
        page: pageParam,
        search,
        leadStatusId: typeof tab === 'number' ? tab : undefined,
        viewed: tab === 'unread' ? false : undefined,
        mine: mode === 'mine',
        ...leadFilterParams(filters),
      }),
    getNextPageParam: (last) => {
      const current = last.meta.current_page ?? last.meta.page ?? 1;
      const lastPage = last.meta.last_page ?? last.meta.totalPages ?? current;
      return current < lastPage ? current + 1 : undefined;
    },
  });

/** @deprecated Prefer leadsListQuery('mine', ...). */
export const myLeadsQuery = (
  search: string,
  tab: LeadListTab = 'all',
  filters: LeadFilters = NO_LEAD_FILTERS
) => leadsListQuery('mine', search, tab, filters);

type StatusCounts = {
  total: number;
  byStatus: { leadStatusId: number | null; count: number }[];
};

async function fetchStatusCounts(params: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<StatusCounts>>(
    '/crm/leads/status-counts',
    { params }
  );
  return data.data;
}

export type LeadTabCounts = {
  all: number;
  unread: number;
  byStatus: Record<number, number>;
};

/** Badge counts for the lead list tabs (same search and filters as the list). */
export const leadTabCountsQuery = (
  mode: LeadListMode,
  search: string,
  filters: LeadFilters = NO_LEAD_FILTERS
) =>
  queryOptions({
    // Under LEADS_QUERY_ROOT so every list invalidation refreshes the badges too.
    // Sort never changes a count, so it stays out of the key.
    queryKey: [
      LEADS_QUERY_ROOT,
      mode,
      'counts',
      search,
      { ...filters, sort: NO_LEAD_FILTERS.sort },
    ],
    queryFn: async (): Promise<LeadTabCounts> => {
      const { sort: _sort, ...params } = leadFilterParams(filters);
      const shared = {
        ...params,
        search: search || undefined,
        ...(mode === 'mine' ? { mine: true } : {}),
      };
      const [all, unread] = await Promise.all([
        fetchStatusCounts(shared),
        fetchStatusCounts({ ...shared, viewed: false }),
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

/** Follow-ups list tabs: what needs doing across all dates. */
export type FollowUpBucket = 'overdue' | 'upcoming';

export type FollowUpBucketPage = {
  items: MyFollowUp[];
  nextCursor: string | null;
  /** The whole bucket, not just this page. */
  total: number;
};

export const FOLLOW_UP_BUCKET_KEY = ['my-follow-ups', 'bucket'] as const;

/** Never fresh: rows change bucket as time passes, not only on a write. */
export const followUpBucketQuery = (bucket: FollowUpBucket) =>
  infiniteQueryOptions({
    queryKey: [...FOLLOW_UP_BUCKET_KEY, bucket],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<ApiResponse<FollowUpBucketPage>>(
        '/crm/mobile/dashboard/follow-ups',
        { params: { bucket, cursor: pageParam ?? undefined } }
      );
      return data.data;
    },
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 0,
  });

/** My follow-ups due in `month` (`yyyy-MM`, local time) — Pending, Done and Missed. */
export const followUpMonthQuery = (month: string) =>
  queryOptions({
    queryKey: ['my-follow-ups', 'month', month],
    queryFn: async () => {
      const [year, monthNo] = month.split('-').map(Number);
      const { data } = await api.get<ApiResponse<MyFollowUp[]>>(
        '/crm/mobile/dashboard/follow-ups',
        {
          params: {
            from: new Date(year, monthNo - 1, 1).toISOString(),
            to: new Date(year, monthNo, 0, 23, 59, 59, 999).toISOString(),
          },
        }
      );
      return { items: data.data };
    },
  });
