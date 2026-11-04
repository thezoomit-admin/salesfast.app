import { useMemo } from 'react';

import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';

/**
 * Setup items that still need attention in Settings.
 * Shown as a badge count on every Settings icon.
 */
export function useSettingsPendingCount() {
  const callSync = useCallSyncStatus();

  const items = useMemo(() => {
    const list: string[] = [];
    if (
      callSync.status === 'not_configured' ||
      callSync.status === 'paused' ||
      callSync.status === 'needs_dev_build'
    ) {
      list.push('call-sync');
    }
    return list;
  }, [callSync.status]);

  return {
    count: items.length,
    items,
    loading: callSync.loading,
    refresh: callSync.refresh,
  };
}
