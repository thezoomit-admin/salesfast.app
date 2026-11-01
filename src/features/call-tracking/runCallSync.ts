import { PermissionsAndroid, Platform } from 'react-native';

import {
  getRecentCalls,
  hasCallLogPermission,
  isCallLogModuleAvailable,
} from 'android-call-log';

import {
  fetchCallMatchDirectory,
  uploadMatchedCalls,
  type CallSyncUploadItem,
} from './callSyncApi';
import { mapAndroidCallType } from './mapCallDirection';
import { phoneMatchKey } from './phoneMatch';
import {
  loadCallSyncPrefs,
  saveCallSyncPrefs,
} from './syncPreferences';

export type CallSyncRunResult = {
  ok: boolean;
  message: string;
  scanned: number;
  matched: number;
  created: number;
  duplicates: number;
  unmatched: number;
};

async function ensureCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (await hasCallLogPermission()) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    {
      title: 'Call history access',
      message:
        'Realist CRM reads call history only to match numbers with your CRM leads.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function runCallSync(options?: {
  force?: boolean;
}): Promise<CallSyncRunResult> {
  const empty = (message: string, ok = false): CallSyncRunResult => ({
    ok,
    message,
    scanned: 0,
    matched: 0,
    created: 0,
    duplicates: 0,
    unmatched: 0,
  });

  if (Platform.OS === 'web') {
    return empty('Call sync runs on Android only.');
  }

  const prefs = await loadCallSyncPrefs();
  if (!prefs.consentedAt || !prefs.enabled) {
    return empty('Complete call sync setup first.');
  }
  if (prefs.paused && !options?.force) {
    return empty('Call sync is paused.');
  }

  if (!isCallLogModuleAvailable()) {
    return empty(
      'Expo Go cannot read call logs. Install the Realist CRM development build, then tap Sync now.'
    );
  }

  const granted = await ensureCallLogPermission();
  if (!granted) {
    return empty('Call log permission was denied.');
  }

  // Match against recent device call history (no enable-time cutoff).
  // Native module caps at 300 rows; unmatched personal numbers are never uploaded.
  const rows = await getRecentCalls(300, 0);
  const directory = await fetchCallMatchDirectory();
  const keySet = new Set(directory.entries.map((e) => e.phoneKey));

  const payload: CallSyncUploadItem[] = [];
  for (const row of rows) {
    const key = phoneMatchKey(row.number);
    if (!key || !keySet.has(key)) continue;
    const deviceCallId = `android:${row.id}:${row.dateMs}:${row.type}`;
    payload.push({
      deviceCallId,
      phone: row.number,
      direction: mapAndroidCallType(row.type),
      startedAt: new Date(row.dateMs).toISOString(),
      durationSec: Math.max(0, Number(row.durationSec) || 0),
    });
  }

  if (!payload.length) {
    await saveCallSyncPrefs({ lastSyncedAt: new Date().toISOString() });
    return {
      ok: true,
      message: `No matched lead calls in recent history (${directory.count} lead numbers watched).`,
      scanned: rows.length,
      matched: 0,
      created: 0,
      duplicates: 0,
      unmatched: 0,
    };
  }

  // Batch in chunks of 100
  let created = 0;
  let duplicates = 0;
  let unmatched = 0;
  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100);
    const result = await uploadMatchedCalls(chunk);
    created += result.created;
    duplicates += result.duplicates;
    unmatched += result.unmatched;
  }

  await saveCallSyncPrefs({ lastSyncedAt: new Date().toISOString() });

  return {
    ok: true,
    message:
      created > 0
        ? `Synced ${created} call${created === 1 ? '' : 's'} to Call History.`
        : duplicates > 0
          ? 'Calls already synced — nothing new.'
          : 'No new matched calls to upload.',
    scanned: rows.length,
    matched: payload.length,
    created,
    duplicates,
    unmatched,
  };
}
