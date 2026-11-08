import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { HomeBannerCarousel } from '@/components/home/HomeBannerCarousel';
import { HomeDashboard } from '@/components/home/HomeDashboard';
import { heroBase, HomeHero } from '@/components/home/HomeHero';
import {
  HomeOtherServices,
  HomeQuickActions,
} from '@/components/home/HomeQuickActions';
import { HomeTips } from '@/components/home/HomeTips';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Screen } from '@/components/ui/Screen';
import { HomeSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { markFirstContent } from '@/lib/perfMonitor';
import { spacing, useTheme, type ThemeColors } from '@/theme';

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

function HomeScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      {/* Only the sheet scrolls; its rounded top stays under the fixed hero. */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <AppRefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={colors.brand}
          />
        }
      >
        {/* These need no data, so they stay usable while the dashboard loads. */}
        <HomeQuickActions />
        <HomeBannerCarousel />
        {data ? (
          <HomeDashboard
            kpis={data.kpis}
            trends={data.trends}
            completedByDay={data.completedByDay}
            recentLeads={data.recentLeads ?? []}
            queue={queue}
          />
        ) : (
          <QueryPlaceholder
            query={query}
            errorMessage={getErrorMessage(query.error)}
            skeleton={<HomeSkeleton />}
          />
        )}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its content,
      // or the scroll view has nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: 20,
      paddingBottom: spacing.xl,
      gap: spacing.xl,
    },
  });
}
