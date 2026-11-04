import {
  useInfiniteQuery,
  useQueries,
  useQueryClient,
  type InfiniteData,
  type UseQueryResult,
} from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { startOfWeek } from 'date-fns/startOfWeek';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';

import { getErrorMessage } from '@/api/client';
import { useFollowUpActions, type FollowUpTarget } from '@/components/followups/FollowUpActions';
import { groupByDay } from '@/components/followups/followUpCalendar';
import { FollowUpBucketView } from '@/components/followups/FollowUpBucketView';
import { FollowUpCalendarSheet } from '@/components/followups/FollowUpCalendarSheet';
import { FollowUpTabs, type FollowUpTab } from '@/components/followups/FollowUpTabs';
import { FollowUpWeekView } from '@/components/followups/FollowUpWeekView';
import { leadRowOfFollowUp } from '@/features/leads/leadDetailCache';
import {
  FOLLOW_UP_BUCKET_KEY,
  followUpBucketQuery,
  followUpMonthKey,
  followUpMonthQuery,
  type FollowUpBucketPage,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { MyFollowUp } from '@/types/api';

type MonthData = { items: MyFollowUp[] };

function targetOf(f: MyFollowUp): FollowUpTarget {
  return {
    followUpId: f.id,
    leadId: f.lead.id,
    leadName: f.lead.name,
    leadPhone: f.lead.phone,
    type: f.type,
    dueAt: f.dueAt,
    open: f.status !== 'DONE',
  };
}

/** Module-level so useQueries memoizes the merged result between renders. */
function combineMonths(results: UseQueryResult<MonthData>[]) {
  return {
    items: results.flatMap((r) => r.data?.items ?? []),
    loading: results.some((r) => r.isPending),
    refreshing: results.some((r) => r.isRefetching),
    error: results.find((r) => r.error)?.error ?? null,
    refetch: () => Promise.all(results.map((r) => r.refetch())),
  };
}

function bucketTotal(data: InfiniteData<FollowUpBucketPage>) {
  return data.pages[0]?.total ?? 0;
}

function FollowUpsScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FollowUpTab>('calendar');
  const [selected, setSelected] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  // A week can straddle two months.
  const months = useMemo(() => {
    const start = startOfWeek(selected);
    return [...new Set([followUpMonthKey(start), followUpMonthKey(addDays(start, 6))])];
  }, [selected]);

  const data = useQueries({
    queries: months.map(followUpMonthQuery),
    combine: combineMonths,
  });

  const { data: overdueCount } = useInfiniteQuery({
    ...followUpBucketQuery('overdue'),
    select: bucketTotal,
  });
  const { data: upcomingCount } = useInfiniteQuery({
    ...followUpBucketQuery('upcoming'),
    select: bucketTotal,
  });

  // Rows cross from Upcoming to Overdue with time, not only after a write.
  useFocusEffect(
    useCallback(() => {
      void queryClient.refetchQueries(
        { queryKey: FOLLOW_UP_BUCKET_KEY, type: 'active' },
        { cancelRefetch: false }
      );
    }, [queryClient])
  );

  const byDay = useMemo(() => groupByDay(data.items), [data.items]);
  const leadRows = useMemo(() => data.items.map(leadRowOfFollowUp), [data.items]);
  const { openLead, prefetchLead } = useLeadRowHandlers(leadRows);
  const actions = useFollowUpActions();
  const { openMenu, openComplete } = actions;

  const onOpen = useCallback((f: MyFollowUp) => openLead(leadRowOfFollowUp(f)), [openLead]);
  const onPressIn = useCallback(
    (f: MyFollowUp) => prefetchLead(leadRowOfFollowUp(f)),
    [prefetchLead]
  );
  const onMore = useCallback((f: MyFollowUp) => openMenu(targetOf(f)), [openMenu]);
  const onComplete = useCallback((f: MyFollowUp) => openComplete(targetOf(f)), [openComplete]);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const refresh = useCallback(() => void data.refetch(), [data]);

  const tabs = useMemo(
    () => (
      <FollowUpTabs
        active={tab}
        overdueCount={overdueCount}
        upcomingCount={upcomingCount}
        onChange={setTab}
      />
    ),
    [overdueCount, tab, upcomingCount]
  );

  return (
    <>
      {tab === 'calendar' ? (
        <FollowUpWeekView
          tabs={tabs}
          selected={selected}
          byDay={byDay}
          loading={data.loading}
          errorMessage={data.error ? getErrorMessage(data.error) : null}
          refreshing={data.refreshing}
          onRefresh={refresh}
          onSelect={setSelected}
          onPickDate={openPicker}
          onOpen={onOpen}
          onPressIn={onPressIn}
          onMore={onMore}
          onComplete={onComplete}
        />
      ) : (
        <FollowUpBucketView
          bucket={tab}
          tabs={tabs}
          onMore={onMore}
          onComplete={onComplete}
        />
      )}
      {actions.sheets}
      <FollowUpCalendarSheet
        open={pickerOpen}
        selected={selected}
        onSelect={setSelected}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

export default memo(FollowUpsScreen);
