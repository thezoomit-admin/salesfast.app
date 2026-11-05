import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { HomeBannerCarousel } from '@/components/home/HomeBannerCarousel';
import {
  HomeDashboardMore,
  HomeDashboardTop,
} from '@/components/home/HomeDashboard';
import { heroBase, HomeHero } from '@/components/home/HomeHero';
import { homePalette } from '@/components/home/homePalette';
import {
  HomeOtherServices,
  HomeQuickActions,
} from '@/components/home/HomeQuickActions';
import { HomeTips } from '@/components/home/HomeTips';
import { Screen } from '@/components/ui/Screen';
import { HomeSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { markFirstContent } from '@/lib/perfMonitor';
import { spacing, useTheme } from '@/theme';

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

function HomeScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  const { user } = useAuth();
  const callSync = useCallSyncStatus();
  const query = useQuery(dashboardQuery);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
    }, [callSync.refresh])
  );

  // The hero is dark enough to need light icons in both themes. Imperative so
  // a tab switch doesn't re-render the dashboard.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  useFirstContent('home', query.data !== undefined, query.isFetchedAfterMount);

  const data = query.data;
  const queue = [...(data?.upcomingFollowUps ?? [])]
    .sort((a, b) => {
      const aOver = isOverdue(a.dueAt) ? 0 : 1;
      const bOver = isOverdue(b.dueAt) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 4);

  const summary = data
    ? `${data.kpis.todayFollowUps} due · ${data.kpis.overdueFollowUps} overdue`
    : null;

  return (
    <Screen
      header={
        <HomeHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      {/* Only the sheet scrolls; it starts where the fixed hero's wave ends. */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.brand}
          />
        }
      >
        {data ? (
          <HomeDashboardTop
            kpis={data.kpis}
            trends={data.trends}
            completedByDay={data.completedByDay}
            queue={queue}
          />
        ) : (
          <QueryPlaceholder
            query={query}
            errorMessage={getErrorMessage(query.error)}
            skeleton={<HomeSkeleton />}
          />
        )}
        {/* These need no data, so they stay usable while the dashboard loads. */}
        <HomeQuickActions />
        <HomeBannerCarousel />
        {data ? (
          <HomeDashboardMore
            kpis={data.kpis}
            trends={data.trends}
            recentLeads={data.recentLeads ?? []}
          />
        ) : null}
        <HomeOtherServices />
        <HomeTips />
      </ScrollView>
    </Screen>
  );
}

export default memo(HomeScreen);

function useFirstContent(screen: string, hasData: boolean, fetched: boolean) {
  useEffect(() => {
    if (hasData) markFirstContent(screen, !fetched);
  }, [screen, hasData, fetched]);
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its content,
      // or the scroll view has nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      overflow: 'hidden',
      backgroundColor: homePalette(isDark).sheet,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: 8,
      paddingBottom: spacing.xl,
      gap: 18,
    },
  });
}
