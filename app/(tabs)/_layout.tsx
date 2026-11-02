import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import { type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AddTeam02Icon,
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  Settings01Icon,
} from '@/components/icons/hugeicons';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  FOLLOW_UP_TABS,
  followUpLeadsQuery,
  leadStatusesQuery,
  myLeadsQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';
import { useThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

/** Base tab bar content height (icons + labels), excluding system nav inset. */
const TAB_BAR_CONTENT_HEIGHT = 56;

function HugeTabIcon({
  icon,
  color,
  size,
  fallback,
}: {
  icon: HugeIconData;
  color: ColorValue;
  size: number;
  fallback: string;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size ?? 24}
      color={typeof color === 'string' ? color : fallback}
      strokeWidth={1.8}
    />
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  // Shares the Home dashboard cache, so this adds no extra request.
  const dashboard = useQuery(dashboardQuery);
  const overdue = dashboard.data?.kpis.overdueFollowUps ?? 0;
  const insets = useSafeAreaInsets();
  // Android 3-button / gesture nav overlays the app (edge-to-edge).
  const bottomInset = Math.max(insets.bottom, 8);

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
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 16,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <HugeTabIcon
              icon={Home03Icon}
              color={color}
              size={size}
              fallback={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ color, size }) => (
            <HugeTabIcon
              icon={AddTeam02Icon}
              color={color}
              size={size}
              fallback={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="follow-ups"
        options={{
          title: 'Follow-ups',
          tabBarBadge: overdue > 0 ? (overdue > 99 ? '99+' : overdue) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.white },
          tabBarIcon: ({ color, size }) => (
            <HugeTabIcon
              icon={Calendar03Icon}
              color={color}
              size={size}
              fallback={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => (
            <HugeTabIcon
              icon={CallIcon}
              color={color}
              size={size}
              fallback={colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <HugeTabIcon
              icon={Settings01Icon}
              color={color}
              size={size}
              fallback={colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
