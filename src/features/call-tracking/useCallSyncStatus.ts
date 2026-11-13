import { useCallback, useEffect, useState } from 'react';

import {
  loadCallSyncPrefs,
  resolveCallSyncStatus,
  saveCallSyncPrefs,
  type CallSyncPrefs,
} from './syncPreferences';

export function useCallSyncStatus() {
  const [prefs, setPrefs] = useState<CallSyncPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  // Runs on every tab focus, so it must not re-render a screen when nothing
  // changed: `loading` stays for the first read, and equal prefs are dropped.
  const refresh = useCallback(async () => {
    try {
      const next = await loadCallSyncPrefs();
      setPrefs((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(async (patch: Partial<CallSyncPrefs>) => {
    const next = await saveCallSyncPrefs(patch);
    setPrefs(next);
    return next;
  }, []);

  const resolved = resolveCallSyncStatus(
    prefs ?? {
      consentedAt: null,
      enabled: false,
      paused: false,
      syncFromAt: null,
      lastSyncedAt: null,
      updatedAt: null,
    }
  );

  return {
    prefs,
    loading,
    refresh,
    update,
    ...resolved,
  };
}
