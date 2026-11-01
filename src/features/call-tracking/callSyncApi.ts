import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

export type CallSyncDirection =
  | 'INCOMING'
  | 'OUTGOING'
  | 'MISSED'
  | 'REJECTED'
  | 'UNKNOWN';

export type CallSyncUploadItem = {
  deviceCallId: string;
  phone: string;
  direction: CallSyncDirection;
  startedAt: string;
  durationSec: number;
};

export type CallSyncUploadResult = {
  accepted: number;
  created: number;
  duplicates: number;
  unmatched: number;
  matchDirectorySize?: number;
  results: Array<{
    deviceCallId: string;
    status: 'created' | 'duplicate' | 'unmatched' | 'invalid';
    leadId?: number;
    noteId?: number;
  }>;
};

export type MatchDirectory = {
  count: number;
  entries: Array<{ phoneKey: string; leadId: number; leadName: string }>;
};

export async function fetchCallMatchDirectory() {
  const { data } = await api.get<ApiResponse<MatchDirectory>>(
    '/crm/mobile/call-sync/match-directory'
  );
  return data.data;
}

export async function uploadMatchedCalls(calls: CallSyncUploadItem[]) {
  const { data } = await api.post<ApiResponse<CallSyncUploadResult>>(
    '/crm/mobile/call-sync',
    { calls }
  );
  return data.data;
}
