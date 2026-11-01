import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';

import { loadCallSyncPrefs } from './syncPreferences';
import { runCallSync } from './runCallSync';

/** Foreground sync for consented Android installs. */
export function CallSyncBootstrap() {
  const { user } = useAuth();
  const running = useRef(false);

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
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tick();
    });
    return () => sub.remove();
  }, [user]);

  return null;
}
