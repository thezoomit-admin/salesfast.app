import { useQuery } from '@tanstack/react-query';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  getRecentCalls,
  hasCallLogPermission,
  isCallLogModuleAvailable,
} from 'android-call-log';

import { fetchCallMatchDirectory, type CallSyncDirection } from './callSyncApi';
import { mapAndroidCallType } from './mapCallDirection';
import { phoneMatchKey } from './phoneMatch';

export type RecentCall = {
  key: string;
  phone: string;
  direction: CallSyncDirection;
  startedAt: Date;
  durationSec: number;
  leadId: number | null;
  leadName: string | null;
};

export type RecentCallsResult =
  | { state: 'unsupported' }
  | { state: 'no_permission' }
  | { state: 'ok'; calls: RecentCall[]; watchedCount: number };

export const RECENT_CALLS_KEY = ['device-recent-calls'] as const;

/** Rows are read on-device for display only — nothing here is uploaded. */
async function loadRecentCalls(): Promise<RecentCallsResult> {
  if (Platform.OS !== 'android' || !isCallLogModuleAvailable()) {
    return { state: 'unsupported' };
  }
  if (!(await hasCallLogPermission())) {
    return { state: 'no_permission' };
  }

  const [rows, directory] = await Promise.all([
    getRecentCalls(150, 0),
    fetchCallMatchDirectory(),
  ]);

  const byKey = new Map(directory.entries.map((e) => [e.phoneKey, e]));

  const calls = rows
    .map<RecentCall>((row) => {
      const key = phoneMatchKey(row.number);
      const match = key ? byKey.get(key) : undefined;
      return {
        key: `${row.id}:${row.dateMs}`,
        phone: row.number,
        direction: mapAndroidCallType(row.type),
        startedAt: new Date(row.dateMs),
        durationSec: Math.max(0, Number(row.durationSec) || 0),
        leadId: match?.leadId ?? null,
        leadName: match?.leadName ?? null,
      };
    })
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return { state: 'ok', calls, watchedCount: directory.count };
}

export function useRecentCalls(enabled: boolean) {
  return useQuery({
    queryKey: RECENT_CALLS_KEY,
    queryFn: loadRecentCalls,
    enabled,
  });
}

export async function requestCallLogPermission() {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    {
      title: 'Call history access',
      message:
        'SalesFast CRM reads call history only to match numbers with your CRM leads.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function isMissed(direction: CallSyncDirection) {
  return direction === 'MISSED' || direction === 'REJECTED';
}
