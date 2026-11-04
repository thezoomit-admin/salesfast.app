import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { HomeDashboard } from '@/components/home/HomeDashboard';
import { Message01Icon, Settings01Icon } from '@/components/icons/hugeicons';
import { Screen } from '@/components/ui/Screen';
import { HomeSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { markFirstContent } from '@/lib/perfMonitor';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

const FAVICON = require('../../assets/images/favicon.png');

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

function HomeScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const pageWash = isDark ? colors.background : '#EEF1F4';
  const styles = useMemo(
    () => createStyles(colors, pageWash),
    [colors, pageWash]
  );
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
            <Image
              source={FAVICON}
              style={styles.brandMarkImage}
              resizeMode="contain"
            />
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
          </Pressable>
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
            <HugeiconsIcon
              icon={Message01Icon}
              size={20}
              color={colors.text}
              strokeWidth={1.8}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            onPress={() => router.navigate('/(tabs)/profile')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.pressed,
            ]}
          >
            <HugeiconsIcon
              icon={Settings01Icon}
              size={20}
              color={colors.text}
              strokeWidth={1.8}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  useFirstContent('home', query.data !== undefined, query.isFetchedAfterMount);

  if (!query.data) {
    return (
      <Screen
        header={homeHeader}
        style={{ backgroundColor: pageWash }}
        contentStyle={styles.screenContent}
      >
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
      style={{ backgroundColor: pageWash }}
      contentStyle={styles.screenContent}
    >
      <HomeDashboard
        kpis={data.kpis}
        followUpStats={data.followUpStats}
        recentLeads={data.recentLeads ?? []}
        queue={queue}
        firstName={firstName}
      />
    </Screen>
  );
}

export default memo(HomeScreen);

function useFirstContent(screen: string, hasData: boolean, fetched: boolean) {
  useEffect(() => {
    if (hasData) markFirstContent(screen, !fetched);
  }, [screen, hasData, fetched]);
}

function createStyles(colors: ThemeColors, pageWash: string) {
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
      backgroundColor: pageWash,
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
      gap: 4,
      minWidth: 0,
    },
    brandMarkImage: {
      width: 36,
      height: 36,
      flexShrink: 0,
    },
    headerName: {
      ...typography.subtitle,
      flexShrink: 1,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
      minWidth: 0,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 0,
    },
  });
}
