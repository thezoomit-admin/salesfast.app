import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopTabs } from 'expo-router/js-top-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import { useEffect } from 'react';

import { AppTabBar, TAB_ORDER } from '@/components/navigation/AppTabBar';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  followUpMonthKey,
  followUpMonthQuery,
  leadStatusesQuery,
  leadTabCountsQuery,
  myLeadsQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';

// Pages are declared left → right, so Home needs to be the anchor explicitly.
export const unstable_settings = { anchor: 'index' };

type TabNavigation = {
  getState: () => { routes: { name: string }[] };
  dispatch: (action: ReturnType<typeof CommonActions.preload>) => void;
};

/** Mount the pages either side of `name`, so a tab switch never reveals a blank page. */
function preloadNeighbours(navigation: TabNavigation, name: string) {
  const index = TAB_ORDER.indexOf(name as (typeof TAB_ORDER)[number]);
  const loaded = navigation.getState().routes;
  for (const neighbour of [TAB_ORDER[index - 1], TAB_ORDER[index + 1]]) {
    if (neighbour && !loaded.some((route) => route.name === neighbour)) {
      navigation.dispatch(CommonActions.preload(neighbour));
    }
  }
}

export default function TabLayout() {
  // Shares the Home dashboard cache, so this adds no extra request.
  const dashboard = useQuery(dashboardQuery);
  const overdue = dashboard.data?.kpis.overdueFollowUps ?? 0;

  // Warm the other tabs after Home loads so switching tabs shows data at once.
  const queryClient = useQueryClient();
  const homeReady = !dashboard.isPending;

  // Same cache as the Leads screen's Unread tab count, so opening a lead
  // (which invalidates ['my-leads', 'counts']) updates this badge too.
  const leadCounts = useQuery({ ...leadTabCountsQuery(''), enabled: homeReady });
  const unread = leadCounts.data?.unread ?? 0;

  useEffect(() => {
    if (!homeReady) return;
    void queryClient.prefetchInfiniteQuery(myLeadsQuery(''));
    void queryClient.prefetchQuery(
      followUpMonthQuery(followUpMonthKey(new Date()))
    );
    void queryClient.prefetchQuery(leadStatusesQuery);
    void queryClient.prefetchQuery(noteChannelsQuery);
  }, [homeReady, queryClient]);

  return (
    <TopTabs
      // Native pager (react-native-pager-view).
      tabBarPosition="bottom"
      backBehavior="initialRoute"
      tabBar={(props) => (
        <AppTabBar
          {...props}
          badges={{ leads: unread, 'follow-ups': overdue }}
        />
      )}
      screenOptions={{
        // Tabs switch only from the tab bar, never by swiping the page.
        swipeEnabled: false,
        animationEnabled: true,
        // Pages mount on first visit or when they become a neighbour,
        // then stay mounted.
        lazy: true,
      }}
      screenListeners={({ navigation, route }) => ({
        focus: () => preloadNeighbours(navigation, route.name),
      })}
    >
      {/* Declaration order is the pager order — keep it equal to TAB_ORDER. */}
      <TopTabs.Screen name="leads" options={{ title: 'Leads' }} />
      <TopTabs.Screen name="follow-ups" options={{ title: 'Follow-ups' }} />
      <TopTabs.Screen name="index" options={{ title: 'Home' }} />
      <TopTabs.Screen name="calls" options={{ title: 'Calls' }} />
      <TopTabs.Screen name="profile" options={{ title: 'Profile' }} />
    </TopTabs>
  );
}
