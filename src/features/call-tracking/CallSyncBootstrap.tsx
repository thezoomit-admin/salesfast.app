import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import {
  getRecentCalls,
  hasCallLogPermission,
  isCallLogModuleAvailable,
} from 'android-call-log';

import { useAuth } from '@/features/auth/AuthContext';

import { loadCallSyncPrefs } from './syncPreferences';
import { runCallSync } from './runCallSync';

/** How often to push matched call-log rows while the app is in the foreground. */
const FOREGROUND_SYNC_MS = 30_000;

/** Identity of the newest call-log row, or null when it can't be read cheaply. */
async function newestCallKey() {
  if (!isCallLogModuleAvailable() || !(await hasCallLogPermission())) return null;
  const [row] = await getRecentCalls(1, 0);
  return row ? `${row.id}:${row.dateMs}:${row.type}` : 'empty';
}

/** Foreground sync for consented Android installs. */
export function CallSyncBootstrap() {
  const { user } = useAuth();
  const running = useRef(false);
  /** Newest call-log row covered by the last successful sync. */
  const syncedThrough = useRef<string | null>(null);
  const appState = useRef<AppStateStatus | null | undefined>(
    AppState.currentState as AppStateStatus | null | undefined,
  );

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const tick = async () => {
      if (running.current) return;
      const prefs = await loadCallSyncPrefs();
      if (!prefs.enabled || prefs.paused || !prefs.consentedAt) return;
      running.current = true;
      try {
        // Nothing new in the call log since the last successful sync → skip
        // the 300-row scan and the (large) match-directory download.
        const newest = await newestCallKey();
        if (newest && newest === syncedThrough.current) return;
        const result = await runCallSync();
        syncedThrough.current = result.ok ? newest : null;
      } catch {
        // Silent — UI surfaces errors on manual Sync now.
        syncedThrough.current = null;
      } finally {
        running.current = false;
      }
    };

    void tick();

    // After a dial, Android often returns here when the user comes back to CRM.
    const sub = AppState.addEventListener('change', (state) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      appState.current = state;
      if (state === 'active' && wasBackground) void tick();
    });

    // Near-realtime while the app stays open (call log has no push callback).
    const interval = setInterval(() => {
      if (appState.current === 'active') void tick();
    }, FOREGROUND_SYNC_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [user]);

  return null;
}
