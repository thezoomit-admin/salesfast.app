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

/**
 * The directory covers every lead phone, so it is large. Background sync and
 * the Calls tab share one copy instead of downloading it every 30s / focus.
 */
const MATCH_DIRECTORY_MAX_AGE_MS = 2 * 60_000;
let directoryCache: { at: number; value: MatchDirectory } | null = null;
let directoryInFlight: Promise<MatchDirectory> | null = null;

export async function getCallMatchDirectory(options?: { fresh?: boolean }) {
  if (
    !options?.fresh &&
    directoryCache &&
    Date.now() - directoryCache.at < MATCH_DIRECTORY_MAX_AGE_MS
  ) {
    return directoryCache.value;
  }
  directoryInFlight ??= fetchCallMatchDirectory()
    .then((value) => {
      directoryCache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      directoryInFlight = null;
    });
  return directoryInFlight;
}

export async function uploadMatchedCalls(
  calls: CallSyncUploadItem[],
  devicePhone?: string | null
) {
  const { data } = await api.post<ApiResponse<CallSyncUploadResult>>(
    '/crm/mobile/call-sync',
    {
      calls,
      ...(devicePhone?.trim() ? { devicePhone: devicePhone.trim() } : {}),
    }
  );
  return data.data;
}
