import { useQuery } from '@tanstack/react-query';
import { PermissionsAndroid, Platform } from 'react-native';

import {
  getRecentCalls,
  hasCallLogPermission,
  isCallLogModuleAvailable,
} from 'android-call-log';

import { getCallMatchDirectory, type CallSyncDirection } from './callSyncApi';
import { keepLeadCalls } from './leadCallFilter';
import { mapAndroidCallType } from './mapCallDirection';

export type RecentCall = {
  key: string;
  phone: string;
  direction: CallSyncDirection;
  startedAt: Date;
  durationSec: number;
  leadId: number;
  leadName: string;
};

export type RecentCallsResult =
  | { state: 'unsupported' }
  | { state: 'no_permission' }
  | { state: 'ok'; calls: RecentCall[]; watchedCount: number };

export const RECENT_CALLS_KEY = ['device-recent-calls'] as const;

/** Lead calls only — personal calls are dropped before they reach the screen. */
async function loadRecentCalls(): Promise<RecentCallsResult> {
  if (Platform.OS !== 'android' || !isCallLogModuleAvailable()) {
    return { state: 'unsupported' };
  }
  if (!(await hasCallLogPermission())) {
    return { state: 'no_permission' };
  }

  const [rows, directory] = await Promise.all([
    getRecentCalls(300, 0),
    getCallMatchDirectory(),
  ]);

  const calls = keepLeadCalls(rows, directory.entries)
    .map<RecentCall>(({ row, lead }) => ({
      key: `${row.id}:${row.dateMs}`,
      phone: row.number,
      direction: mapAndroidCallType(row.type),
      startedAt: new Date(row.dateMs),
      durationSec: Math.max(0, Number(row.durationSec) || 0),
      leadId: lead.leadId,
      leadName: lead.leadName,
    }))
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
