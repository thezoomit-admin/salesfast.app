import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';

import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  FOLLOW_UP_TABS,
  followUpLeadsQuery,
  leadStatusesQuery,
  myLeadsQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';
import { colors } from '@/theme';

function TabIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return (
    <FontAwesome
      size={22}
      style={{ marginBottom: -2 }}
      name={props.name}
      color={props.color}
    />
  );
}

export default function TabLayout() {
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ color }) => (
            <TabIcon name="users" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: 'Follow-ups',
          tabBarBadge: overdue > 0 ? (overdue > 99 ? '99+' : overdue) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.white },
          tabBarIcon: ({ color }) => (
            <TabIcon name="calendar" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color }) => (
            <TabIcon name="phone" color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <TabIcon name="bars" color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
