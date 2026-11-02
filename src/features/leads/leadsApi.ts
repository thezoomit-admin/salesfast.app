import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

import { api } from '@/api/client';
import { endOfLocalDayIso, startOfLocalDayIso } from '@/utils/dates';
import type {
  ApiResponse,
  LeadDetail,
  LeadListItem,
  LeadStatus,
} from '@/types/api';

export type LeadListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  leadStatusId?: number | string;
  followupOverdue?: boolean;
  followupFrom?: string;
  followupTo?: string;
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

export async function fetchLeadById(id: number | string) {
  const { data } = await api.get<ApiResponse<LeadDetail>>(`/crm/leads/${id}`, {
    params: { view: 'full' },
  });
  return data.data;
}

export async function updateLeadStatus(
  id: number | string,
  payload: { leadStatusId: number; expectedVersion?: number }
) {
  const { data } = await api.put<ApiResponse<LeadDetail>>(
    `/crm/leads/${id}`,
    payload
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
  }
) {
  const { data } = await api.post(`/crm/leads/${id}/notes`, payload);
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

export const myLeadsQuery = (search: string, statusId?: number) =>
  infiniteQueryOptions({
    queryKey: ['my-leads', search, statusId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchMyLeads({ page: pageParam, search, leadStatusId: statusId }),
    getNextPageParam: (last) => {
      const current = last.meta.current_page ?? last.meta.page ?? 1;
      const lastPage = last.meta.last_page ?? last.meta.totalPages ?? current;
      return current < lastPage ? current + 1 : undefined;
    },
  });

export type FollowUpTab = 'today' | 'overdue' | 'upcoming';
export const FOLLOW_UP_TABS: FollowUpTab[] = ['today', 'overdue', 'upcoming'];

function followUpParams(tab: FollowUpTab): LeadListParams {
  if (tab === 'overdue') return { followupOverdue: true };
  if (tab === 'today') {
    return { followupFrom: startOfLocalDayIso(), followupTo: endOfLocalDayIso() };
  }
  return { followupFrom: endOfLocalDayIso() };
}

export const followUpLeadsQuery = (tab: FollowUpTab) =>
  queryOptions({
    queryKey: ['follow-up-leads', tab],
    queryFn: () => fetchMyLeads({ ...followUpParams(tab), per_page: 50 }),
  });
