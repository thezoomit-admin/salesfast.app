import { useCallback, useState } from 'react';

import { LeadHistorySheet } from '@/components/home/LeadHistorySheet';
import { PriorityPickerSheet } from '@/components/home/PriorityPickerSheet';
import { useLeadPriorityMutation } from '@/features/leads/useLeadPriorityMutation';
import type { LeadListItem, LeadPriority } from '@/types/api';

type Target = {
  leadId: number;
  leadName: string;
  priority: LeadPriority | null;
};

function toTarget(lead: LeadListItem): Target {
  return {
    leadId: lead.id,
    leadName: lead.buyerPersona?.fullName || 'Lead',
    priority: lead.priority ?? null,
  };
}

/**
 * Priority picker + history sheet for LeadListItemCard rows. The open
 * handlers are stable, so memoized rows don't re-render.
 */
export function useLeadCardSheets() {
  const [priorityTarget, setPriorityTarget] = useState<Target | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Target | null>(null);
  const priorityMutation = useLeadPriorityMutation(() =>
    setPriorityTarget(null)
  );

  const openPriority = useCallback(
    (lead: LeadListItem) => setPriorityTarget(toTarget(lead)),
    []
  );
  const openHistory = useCallback(
    (lead: LeadListItem) => setHistoryTarget(toTarget(lead)),
    []
  );

  const sheets = (
    <>
      <PriorityPickerSheet
        open={!!priorityTarget}
        leadName={priorityTarget?.leadName ?? 'Lead'}
        value={priorityTarget?.priority ?? null}
        saving={priorityMutation.isPending}
        onClose={() => setPriorityTarget(null)}
        onSelect={(priority) => {
          if (!priorityTarget) return;
          const previous = priorityTarget.priority;
          priorityMutation.mutate(
            { leadId: priorityTarget.leadId, priority, previous },
            {
              onError: () =>
                setPriorityTarget((cur) =>
                  cur ? { ...cur, priority: previous } : cur
                ),
            }
          );
          setPriorityTarget({ ...priorityTarget, priority });
        }}
      />

      <LeadHistorySheet
        open={!!historyTarget}
        leadId={historyTarget?.leadId ?? null}
        leadName={historyTarget?.leadName ?? ''}
        onClose={() => setHistoryTarget(null)}
      />
    </>
  );

  return { openPriority, openHistory, sheets };
}
