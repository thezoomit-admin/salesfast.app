import { useCallback, useMemo } from 'react';

import { useCallLeadPromptStatus } from '@/features/call-tracking/callLeadPrompt';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';

/**
 * Setup items that still need attention in Settings.
 * Shown as a badge count on every Settings icon.
 */
export function useSettingsPendingCount() {
  const callSync = useCallSyncStatus();
  const callLeads = useCallLeadPromptStatus();

  const items = useMemo(() => {
    const list: string[] = [];
    if (
      callSync.status === 'not_configured' ||
      callSync.status === 'paused' ||
      callSync.status === 'needs_dev_build'
    ) {
      list.push('call-sync');
    }
    // Never decided, or on but a permission was revoked.
    if (callLeads.undecided || callLeads.needsPermission) {
      list.push('call-leads');
    }
    return list;
  }, [callSync.status, callLeads.undecided, callLeads.needsPermission]);

  const { refresh: refreshCallSync } = callSync;
  const { refresh: refreshCallLeads } = callLeads;
  const refresh = useCallback(async () => {
    await Promise.all([refreshCallSync(), refreshCallLeads()]);
  }, [refreshCallSync, refreshCallLeads]);

  return {
    count: items.length,
    items,
    loading: callSync.loading,
    refresh,
  };
}
