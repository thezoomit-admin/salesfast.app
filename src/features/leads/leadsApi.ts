import { api } from '@/api/client';
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
  const { data } = await api.get<ApiResponse<LeadListItem[]>>('/crm/leads', {
    params: {
      mine: true,
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      search: params.search || undefined,
      leadStatusId: params.leadStatusId || undefined,
      followupOverdue: params.followupOverdue || undefined,
      followupFrom: params.followupFrom || undefined,
      followupTo: params.followupTo || undefined,
    },
  });
  return {
    items: data.data ?? [],
    meta: data.meta ?? {},
  };
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

export async function fetchLeadStatuses() {
  const { data } = await api.get<ApiResponse<LeadStatus[]>>(
    '/crm/lead-statuses'
  );
  return data.data ?? [];
}

export async function fetchNoteChannels() {
  const { data } = await api.get<
    ApiResponse<Array<{ id: number; name: string; status?: string }>>
  >('/crm/note-channels');
  return (data.data ?? []).filter(
    (c) => !c.status || String(c.status).toUpperCase() === 'ACTIVE'
  );
}
