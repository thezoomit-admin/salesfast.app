import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { HomeDashboard } from '@/components/home/HomeDashboard';
import { Search02Icon } from '@/components/icons/hugeicons';
import { Screen } from '@/components/ui/Screen';
import { HomeSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { markFirstContent } from '@/lib/perfMonitor';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const callSync = useCallSyncStatus();
  const query = useQuery(dashboardQuery);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
    }, [callSync.refresh])
  );

  const displayName = user?.name?.trim() || 'Agent';
  const firstName = displayName.split(/\s+/)[0] || 'Agent';
  const syncOk =
    callSync.status === 'configured' || callSync.status === 'unavailable_web';

  const openLeadSearch = useCallback(() => {
    router.navigate({
      pathname: '/(tabs)/leads',
      params: { focusSearch: '1' },
    });
  }, [router]);

  const homeHeader = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerIdentity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => router.navigate('/(tabs)/profile')}
            style={({ pressed }) => [
              styles.headerIdentityTap,
              pressed && styles.pressed,
            ]}
          >
            <UserAvatar uri={user?.profilePhoto} name={user?.name} size={40} />
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
          </Pressable>
          {!syncOk ? (
            <Pressable
              onPress={() => router.navigate('/call-sync/setup')}
              hitSlop={6}
              style={styles.syncWarn}
              accessibilityRole="button"
              accessibilityLabel="Set up call sync"
            >
              <Ionicons
                name="cloud-offline-outline"
                size={12}
                color={colors.warning}
              />
              <Text style={styles.syncWarnText}>Set up call sync</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open activities"
            onPress={() => router.navigate('/activities')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={colors.text}
            />
          </Pressable>
          <NotificationBell plain />
        </View>
      </View>

      <View style={styles.searchBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search leads"
          onPress={openLeadSearch}
          style={({ pressed }) => [
            styles.searchMain,
            pressed && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={Search02Icon}
            size={18}
            color={colors.textMuted}
            strokeWidth={1.8}
          />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search leads...
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open lead search"
          onPress={openLeadSearch}
          hitSlop={8}
          style={({ pressed }) => [
            styles.searchTrailing,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );

  useFirstContent('home', query.data !== undefined, query.isFetchedAfterMount);

  if (!query.data) {
    return (
      <Screen header={homeHeader} contentStyle={styles.screenContent}>
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<HomeSkeleton />}
        />
      </Screen>
    );
  }

  const data = query.data;
  const queue = [...(data.upcomingFollowUps ?? [])]
    .sort((a, b) => {
      const aOver = isOverdue(a.dueAt) ? 0 : 1;
      const bOver = isOverdue(b.dueAt) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 6);

  return (
    <Screen
      header={homeHeader}
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      contentStyle={styles.screenContent}
    >
      <HomeDashboard
        kpis={data.kpis}
        recentLeads={data.recentLeads ?? []}
        queue={queue}
        firstName={firstName}
      />
    </Screen>
  );
}

function useFirstContent(screen: string, hasData: boolean, fetched: boolean) {
  useEffect(() => {
    if (hasData) markFirstContent(screen, !fetched);
  }, [screen, hasData, fetched]);
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenContent: {
      gap: 16,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.sm,
    },
    pressed: { opacity: 0.88 },

    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerIdentity: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    headerIdentityTap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    headerName: {
      ...typography.subtitle,
      flexShrink: 1,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '600',
      color: colors.text,
      minWidth: 0,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingLeft: 14,
      paddingRight: 10,
      minHeight: 46,
      gap: 4,
    },
    searchMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      paddingVertical: 10,
    },
    searchPlaceholder: {
      ...typography.body,
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textMuted,
      minWidth: 0,
    },
    searchTrailing: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    syncWarn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      marginLeft: 50,
      alignSelf: 'flex-start',
    },
    syncWarnText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.warning,
    },
  });
}
