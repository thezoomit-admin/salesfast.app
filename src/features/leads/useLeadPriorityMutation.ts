import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { patchLeadInLists } from '@/features/leads/leadDetailCache';
import { updateLeadPriority } from '@/features/leads/leadsApi';
import type { LeadPriority, MobileDashboard } from '@/types/api';

type Vars = {
  leadId: number;
  priority: LeadPriority;
  /** Restored in the lead lists if the save fails. */
  previous?: LeadPriority | null;
};

function patchDashboardPriority(
  data: MobileDashboard | undefined,
  leadId: number,
  priority: LeadPriority | null
): MobileDashboard | undefined {
  if (!data?.recentLeads) return data;
  let changed = false;
  const recentLeads = data.recentLeads.map((row) => {
    if (row.id !== leadId) return row;
    changed = true;
    return { ...row, priority };
  });
  return changed ? { ...data, recentLeads } : data;
}

/** Optimistic priority change — patches the dashboard and every lead list. */
export function useLeadPriorityMutation(onSaved?: () => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, priority }: Vars) =>
      updateLeadPriority(leadId, { priority }, { accountId: user?.id }),
    onMutate: async ({ leadId, priority }) => {
      await queryClient.cancelQueries({ queryKey: ['mobile-dashboard'] });
      const prev = queryClient.getQueryData<MobileDashboard>([
        'mobile-dashboard',
      ]);
      queryClient.setQueryData<MobileDashboard>(['mobile-dashboard'], (cur) =>
        patchDashboardPriority(cur, leadId, priority)
      );
      patchLeadInLists(queryClient, leadId, { priority });
      return { prev };
    },
    onError: (_e, { leadId, previous }, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['mobile-dashboard'], ctx.prev);
      }
      if (previous !== undefined) {
        patchLeadInLists(queryClient, leadId, { priority: previous });
      }
      Alert.alert('Could not update priority');
    },
    onSuccess: (updated, { leadId }) => {
      if (updated) {
        queryClient.setQueryData(['lead', leadId], updated);
        const next = (updated.priority as LeadPriority | null) ?? null;
        if (next) {
          queryClient.setQueryData<MobileDashboard>(
            ['mobile-dashboard'],
            (cur) => patchDashboardPriority(cur, leadId, next)
          );
          patchLeadInLists(queryClient, leadId, {
            priority: next,
            updatedAt: updated.updatedAt,
          });
        }
      }
      onSaved?.();
    },
  });
}
