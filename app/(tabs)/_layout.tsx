import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopTabs } from 'expo-router/js-top-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { useAuth } from '@/features/auth/AuthContext';
import { canViewAllLeads } from '@/features/auth/leadAccess';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  fetchUnreadByTab,
  UNREAD_BY_TAB_KEY,
} from '@/features/notifications/notificationsApi';
import {
  followUpMonthKey,
  followUpMonthQuery,
  leadStatusesQuery,
  leadTabCountsQuery,
  leadsListQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';

// Pages are declared left → right, so Home needs to be the anchor explicitly.
export const unstable_settings = { anchor: 'index' };

type TabNavigation = {
  getState: () => { routes: { name: string }[] };
  dispatch: (action: ReturnType<typeof CommonActions.preload>) => void;
};

/** Nearest to Home first. Profile last: only the Home header opens it. */
function warmOrder(canViewAll: boolean) {
  return canViewAll
    ? ['follow-ups', 'calls', 'my-leads', 'leads', 'notifications', 'profile']
    : ['follow-ups', 'calls', 'my-leads', 'notifications', 'profile'];
}
const WARM_START_MS = 120;
const WARM_STEP_MS = 80;

/**
 * Mount every tab page soon after Home is up, one at a time, so a tab press
 * never has to build a page. Mounting on press blocks the JS thread right when
 * the page and the tab colour need to change.
 */
function useWarmTabs(
  navigation: TabNavigation | null,
  ready: boolean,
  canViewAll: boolean
) {
  useEffect(() => {
    if (!navigation || !ready) return;
    const pending = [...warmOrder(canViewAll)];
    let timer: ReturnType<typeof setTimeout>;
    const warmNext = () => {
      const name = pending.shift();
      if (!name) return;
      const loaded = navigation
        .getState()
        .routes.some((route) => route.name === name);
      if (!loaded) navigation.dispatch(CommonActions.preload(name));
      timer = setTimeout(warmNext, loaded ? 0 : WARM_STEP_MS);
    };
    timer = setTimeout(warmNext, WARM_START_MS);
    return () => clearTimeout(timer);
  }, [navigation, ready, canViewAll]);
}

export default function TabLayout() {
  const { user } = useAuth();
  const canViewAll = canViewAllLeads(user);

  // Shares the Home dashboard cache, so this adds no extra request.
  const dashboard = useQuery(dashboardQuery);
  const overdue = dashboard.data?.kpis.overdueFollowUps ?? 0;

  // Warm the other tabs after Home loads so switching tabs shows data at once.
  const queryClient = useQueryClient();
  const homeReady = !dashboard.isPending;

  // Same cache as My Leads Unread tab count, so opening a lead
  // (which invalidates ['leads', …]) updates this badge too.
  const leadCounts = useQuery({
    ...leadTabCountsQuery('mine', ''),
    enabled: homeReady,
  });
  const unread = leadCounts.data?.unread ?? 0;

  // Urgent only: an Info count would keep the badge lit and teach people to
  // ignore it. Same cache as the Notifications tabs.
  const inbox = useQuery({
    queryKey: UNREAD_BY_TAB_KEY,
    queryFn: fetchUnreadByTab,
    enabled: homeReady,
    refetchInterval: 60_000,
  });
  const urgent = inbox.data?.urgent ?? 0;

  useEffect(() => {
    if (!homeReady) return;
    void queryClient.prefetchInfiniteQuery(leadsListQuery('mine', ''));
    if (canViewAll) {
      void queryClient.prefetchInfiniteQuery(leadsListQuery('all', ''));
    }
    void queryClient.prefetchQuery(
      followUpMonthQuery(followUpMonthKey(new Date()))
    );
    void queryClient.prefetchQuery(leadStatusesQuery);
    void queryClient.prefetchQuery(noteChannelsQuery);
  }, [homeReady, queryClient, canViewAll]);

  const [tabNavigation, setTabNavigation] = useState<TabNavigation | null>(null);
  useWarmTabs(tabNavigation, homeReady, canViewAll);

  return (
    <TopTabs
      // Native pager (react-native-pager-view).
      tabBarPosition="bottom"
      backBehavior="initialRoute"
      tabBar={(props) => (
        <AppTabBar
          {...props}
          badges={{
            'my-leads': unread,
            'follow-ups': overdue,
            notifications: urgent,
          }}
        />
      )}
      screenOptions={{
        // Tabs switch only from the tab bar, never by swiping the page.
        swipeEnabled: false,
        // Instant switch. A slide scrolls through every page on the way,
        // so far tabs take longest and each page passed has to be drawn.
        animationEnabled: false,
        // Pages mount on first visit or from useWarmTabs, then stay mounted.
        lazy: true,
      }}
      screenListeners={({ navigation }) => ({
        focus: () => setTabNavigation((current) => current ?? navigation),
      })}
    >
      {/* Declaration order is the pager order — keep it aligned with getTabOrder.
          Profile comes last: a page with the bar but no bar item, opened
          from the Home header. */}
      <TopTabs.Screen name="my-leads" options={{ title: 'My Leads' }} />
      <TopTabs.Screen name="leads" options={{ title: 'Leads' }} />
      <TopTabs.Screen name="follow-ups" options={{ title: 'Follow-ups' }} />
      <TopTabs.Screen name="index" options={{ title: 'Home' }} />
      <TopTabs.Screen name="calls" options={{ title: 'Calls' }} />
      <TopTabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <TopTabs.Screen name="profile" options={{ title: 'Profile' }} />
    </TopTabs>
  );
}
