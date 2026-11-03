import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  FOLLOW_UP_TABS,
  followUpLeadsQuery,
  leadStatusesQuery,
  myLeadsQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';
import { useThemeColors } from '@/theme';

export default function TabLayout() {
  const colors = useThemeColors();
  // Shares the Home dashboard cache, so this adds no extra request.
  const dashboard = useQuery(dashboardQuery);
  const overdue = dashboard.data?.kpis.overdueFollowUps ?? 0;

  // Warm the other tabs after Home loads so switching tabs shows data at once.
  const queryClient = useQueryClient();
  const homeReady = !dashboard.isPending;
  useEffect(() => {
    if (!homeReady) return;
    void queryClient.prefetchInfiniteQuery(myLeadsQuery('', undefined));
    for (const tab of FOLLOW_UP_TABS) {
      void queryClient.prefetchQuery(followUpLeadsQuery(tab));
    }
    void queryClient.prefetchQuery(leadStatusesQuery);
    void queryClient.prefetchQuery(noteChannelsQuery);
  }, [homeReady, queryClient]);

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Prefetch warms data; keep every tab mounted so switches feel instant (Hisab).
        lazy: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      {/* Declaration order kept for Expo Router; visual order is AppTabBar TAB_ORDER. */}
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="leads" options={{ title: 'Leads' }} />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: 'Follow-ups',
          tabBarBadge: overdue > 0 ? (overdue > 99 ? '99+' : overdue) : undefined,
        }}
      />
      <Tabs.Screen name="calls" options={{ title: 'Calls' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
