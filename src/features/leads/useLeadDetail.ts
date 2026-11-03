import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import {
  findListLead,
  markOutdatedLeadDetails,
} from '@/features/leads/leadDetailCache';
import {
  leadDetailQuery,
  leadMetaQuery,
  startLeadView,
} from '@/features/leads/leadsApi';
import { markLeadNavigate, markLeadOpen, markLeadTap } from '@/lib/perfMonitor';
import type { LeadListItem } from '@/types/api';

/**
 * Shared lead detail + meta fetch (used by Overview / History / Calls / Views).
 *
 * `leadQuery.isPlaceholderData` is true while only the tapped list row is
 * known: name, phone, status, priority, assignee. Detail-only sections must
 * show their loading state then, never an empty one.
 */
export function useLeadDetail(leadId: number) {
  const queryClient = useQueryClient();

  const leadQuery = useQuery({
    ...leadDetailQuery(leadId),
    placeholderData: () => findListLead(queryClient, leadId),
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

  useLeadOpenTrace(leadId, leadQuery);

  return { leadQuery, metaQuery };
}

/** Dev-only milestones for one screen visit (see perfMonitor). */
function useLeadOpenTrace(
  leadId: number,
  query: ReturnType<typeof useLeadDetail>['leadQuery']
) {
  const seen = useRef(new Set<string>());
  const { data, isPlaceholderData, isFetchedAfterMount, fetchStatus, isError } =
    query;

  useEffect(() => {
    const mark = (stage: string, key = stage) => {
      if (seen.current.has(key)) return;
      seen.current.add(key);
      markLeadOpen(leadId, stage);
    };
    mark('mount');
    if (!data) return;
    mark(
      `content (${isPlaceholderData ? 'list' : isFetchedAfterMount ? 'network' : 'cache'})`,
      'content'
    );
    if (!isPlaceholderData) mark('details');
    if (fetchStatus !== 'idle') return;
    if (isError) mark('refresh failed', 'end');
    else if (isFetchedAfterMount) mark('fresh', 'end');
  }, [leadId, data, isPlaceholderData, isFetchedAfterMount, fetchStatus, isError]);
}

/**
 * Starts the detail request when a finger lands on a lead row, ahead of the
 * tap completing. A no-op when the cached detail is still fresh, when the
 * same request is already in flight, or while offline.
 */
export function usePrefetchLeadDetail() {
  const queryClient = useQueryClient();
  return useCallback(
    (leadId: number) => {
      if (!Number.isFinite(leadId) || !onlineManager.isOnline()) return;
      void queryClient.prefetchQuery(leadDetailQuery(leadId));
    },
    [queryClient]
  );
}

/**
 * Row handlers for lists of LeadListItem. Opening navigates at once (the
 * detail screen paints the row while the detail loads); touch-down starts
 * the detail request. Fresh `rows` also mark outdated cached details stale.
 * Pass a stable `rows` array (memoized / straight from the query).
 */
export function useLeadRowHandlers(rows: readonly LeadListItem[]) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const prefetch = usePrefetchLeadDetail();

  useEffect(() => {
    markOutdatedLeadDetails(queryClient, rows);
  }, [queryClient, rows]);

  const openLead = useCallback(
    (lead: LeadListItem) => {
      markLeadNavigate(lead.id);
      router.push(`/leads/${lead.id}`);
    },
    [router]
  );
  const prefetchLead = useCallback(
    (lead: LeadListItem) => {
      markLeadTap(lead.id);
      prefetch(lead.id);
    },
    [prefetch]
  );
  return { openLead, prefetchLead };
}
