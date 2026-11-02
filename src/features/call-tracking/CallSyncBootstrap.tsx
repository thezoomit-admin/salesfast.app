import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';

import { loadCallSyncPrefs } from './syncPreferences';
import { runCallSync } from './runCallSync';

/** How often to push matched call-log rows while the app is in the foreground. */
const FOREGROUND_SYNC_MS = 30_000;

/** Foreground sync for consented Android installs. */
export function CallSyncBootstrap() {
  const { user } = useAuth();
  const running = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const tick = async () => {
      if (running.current) return;
      const prefs = await loadCallSyncPrefs();
      if (!prefs.enabled || prefs.paused || !prefs.consentedAt) return;
      running.current = true;
      try {
        await runCallSync();
      } catch {
        // Silent — UI surfaces errors on manual Sync now.
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
