import { useQuery } from '@tanstack/react-query';

import { fetchLeadById, leadMetaQuery } from '@/features/leads/leadsApi';

/** Shared lead detail + meta fetch (used by Overview / History / Calls / Views). */
export function useLeadDetail(leadId: number) {
  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });

  const metaQuery = useQuery(leadMetaQuery);

  return { leadQuery, metaQuery };
}
