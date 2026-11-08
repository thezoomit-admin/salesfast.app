import {
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseQueryResult,
} from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { startOfWeek } from 'date-fns/startOfWeek';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { useFollowUpActions, type FollowUpTarget } from '@/components/followups/FollowUpActions';
import { dayKey, groupByDay } from '@/components/followups/followUpCalendar';
import { FollowUpBucketView } from '@/components/followups/FollowUpBucketView';
import { FollowUpCalendarSheet } from '@/components/followups/FollowUpCalendarSheet';
import { FollowUpTabs, type FollowUpTab } from '@/components/followups/FollowUpTabs';
import { FollowUpsHero } from '@/components/followups/FollowUpsHero';
import { FollowUpWeekView } from '@/components/followups/FollowUpWeekView';
import { heroBase } from '@/components/home/HomeHero';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthContext';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { leadRowOfFollowUp } from '@/features/leads/leadDetailCache';
import {
  FOLLOW_UP_BUCKET_KEY,
  followUpBucketQuery,
  followUpMonthKey,
  followUpMonthQuery,
  type FollowUpBucketPage,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import { useTabIntent } from '@/lib/tabIntent';
import { useTheme, type ThemeColors } from '@/theme';
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
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FollowUpTab>('calendar');
  const [selected, setSelected] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  // Home's shortcuts open a tab directly.
  const onIntent = useCallback((value: string) => {
    setTab(value as FollowUpTab);
  }, []);
  useTabIntent('follow-ups', onIntent);

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

  // The hero is dark enough to need light icons in both themes.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  // Shares the Home dashboard cache, so this adds no extra request.
  const { data: dashboard } = useQuery(dashboardQuery);
  const summary = dashboard
    ? `${dashboard.kpis.todayFollowUps} due · ${dashboard.kpis.overdueFollowUps} overdue`
    : null;

  const byDay = useMemo(() => groupByDay(data.items), [data.items]);
  const calendarCount = data.loading
    ? undefined
    : byDay.get(dayKey(selected))?.length;
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
  // From the hero: a picked date only shows on the Calendar tab.
  const pickFromHero = useCallback(() => {
    setTab('calendar');
    setPickerOpen(true);
  }, []);
  const refresh = useCallback(() => void data.refetch(), [data]);

  return (
    <Screen
      header={
        <FollowUpsHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
          onPickDate={pickFromHero}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      <FollowUpTabs
        active={tab}
        calendarCount={calendarCount}
        overdueCount={overdueCount}
        upcomingCount={upcomingCount}
        onChange={setTab}
      />
      {tab === 'calendar' ? (
        <FollowUpWeekView
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
    </Screen>
  );
}

export default memo(FollowUpsScreen);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its content,
      // or the timeline and lists have nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
  });
}
