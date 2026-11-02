import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  fetchLeadById,
  leadMetaQuery,
  startLeadView,
} from '@/features/leads/leadsApi';

/** Shared lead detail + meta fetch (used by Overview / History / Calls / Views). */
export function useLeadDetail(leadId: number) {
  const queryClient = useQueryClient();

  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });

  const metaQuery = useQuery(leadMetaQuery);

  // One visit per lead open — feeds View History (web portal parity).
  useEffect(() => {
    if (!Number.isFinite(leadId)) return;
    void startLeadView(leadId)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['lead-views', leadId] })
      )
      .catch(() => {
        // Best effort.
      });
  }, [leadId, queryClient]);

  return { leadQuery, metaQuery };
}
