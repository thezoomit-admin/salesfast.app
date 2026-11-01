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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadCallSyncPrefs();
      setPrefs(next);
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

  const resolved = resolveCallSyncStatus(prefs ?? {
    consentedAt: null,
    enabled: false,
    paused: false,
    updatedAt: null,
  });

  return {
    prefs,
    loading,
    refresh,
    update,
    ...resolved,
  };
}
