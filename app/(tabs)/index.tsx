import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { markFirstContent } from '@/lib/perfMonitor';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';
import { formatDate, formatRelative } from '@/utils/dates';

function greetingForHour(hour: number) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 14) return 'Good noon';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type KpiTile = {
  key: string;
  label: string;
  value: number;
  href: Href;
  icon: IoniconName;
  tone: 'brand' | 'danger' | 'neutral' | 'accent';
};

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

  const firstName = user?.name?.split(/\s+/)[0] || 'Agent';
  const greeting = useMemo(
    () => `${greetingForHour(new Date().getHours())}, ${firstName}`,
    [firstName]
  );
  const syncOk =
    callSync.status === 'configured' || callSync.status === 'unavailable_web';
  const roleLine = user?.designation?.name?.trim() || 'Sales agent';

  const homeHeader = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.navigate('/(tabs)/profile')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <UserAvatar uri={user?.profilePhoto} name={user?.name} size={40} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={styles.roleLine} numberOfLines={1}>
            {roleLine}
          </Text>
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
      </View>
      <NotificationBell plain />
    </View>
  );

  const data = query.data;
  useFirstContent('home', query.data !== undefined, query.isFetchedAfterMount);

  if (!data) {
    return (
      <Screen header={homeHeader}>
        <QueryPlaceholder
          query={query}
          rows={4}
          errorMessage={getErrorMessage(query.error)}
        />
      </Screen>
    );
  }

  const { kpis } = data;

  const kpiTiles: KpiTile[] = [
    {
      key: 'today',
      label: 'Due today',
      value: kpis.todayFollowUps,
      href: '/(tabs)/follow-ups',
      icon: 'today-outline',
      tone: 'brand',
    },
    {
      key: 'overdue',
      label: 'Overdue',
      value: kpis.overdueFollowUps,
      href: '/(tabs)/follow-ups',
      icon: 'alert-circle-outline',
      tone: kpis.overdueFollowUps > 0 ? 'danger' : 'neutral',
    },
    {
      key: 'assigned',
      label: 'Assigned',
      value: kpis.totalAssigned,
      href: '/(tabs)/leads',
      icon: 'people-outline',
      tone: 'neutral',
    },
    {
      key: 'new',
      label: 'New (7d)',
      value: kpis.newLeads,
      href: '/(tabs)/leads',
      icon: 'sparkles-outline',
      tone: 'accent',
    },
  ];

  const queue = [...data.upcomingFollowUps]
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
      {/* 2×2 day-board KPIs */}
      <View style={styles.kpiGrid}>
        {kpiTiles.map((tile) => {
          const toneStyles = kpiToneStyles(colors, tile.tone);
          return (
            <Pressable
              key={tile.key}
              onPress={() => router.navigate(tile.href)}
              style={({ pressed }) => [
                styles.kpiTile,
                { borderColor: toneStyles.border },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}: ${tile.value}`}
            >
              <View
                style={[styles.kpiAccent, { backgroundColor: toneStyles.accent }]}
              />
              <View style={styles.kpiTop}>
                <View
                  style={[
                    styles.kpiIconWrap,
                    { backgroundColor: toneStyles.iconBg },
                  ]}
                >
                  <Ionicons
                    name={tile.icon}
                    size={16}
                    color={toneStyles.icon}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textMuted}
                />
              </View>
              <Text style={[styles.kpiValue, { color: toneStyles.value }]}>
                {tile.value}
              </Text>
              <Text style={styles.kpiLabel}>{tile.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Today's queue — single agenda */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{"Today's queue"}</Text>
          <Pressable
            onPress={() => router.navigate('/(tabs)/follow-ups')}
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>Open follow-ups</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
        <View style={styles.panel}>
          {queue.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Queue is clear"
              message="No follow-ups lined up. Pick a lead and schedule the next touch."
              actionLabel="Browse leads"
              onAction={() => router.navigate('/(tabs)/leads')}
            />
          ) : (
            queue.map((item, index) => {
              const overdue = isOverdue(item.dueAt);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.queueRow,
                    index > 0 && styles.rowDivider,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                >
                  <View
                    style={[
                      styles.timeCol,
                      overdue ? styles.timeColWarn : styles.timeColDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeColText,
                        overdue && styles.timeColTextWarn,
                      ]}
                      numberOfLines={2}
                    >
                      {formatDate(item.dueAt)}
                    </Text>
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.leadName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.type || 'Follow-up'}
                      {item.leadPhone ? ` · ${item.leadPhone}` : ''}
                    </Text>
                  </View>
                  {overdue ? (
                    <Text style={styles.overdueMark}>Overdue</Text>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.textMuted}
                    />
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* Pipeline updates */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pipeline updates</Text>
          <Pressable
            onPress={() => router.navigate('/(tabs)/leads')}
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>All leads</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
        <View style={styles.panel}>
          {data.recentLeads.length === 0 ? (
            <Text style={styles.inlineEmpty}>No recent lead activity.</Text>
          ) : (
            data.recentLeads.slice(0, 5).map((lead, index) => (
              <Pressable
                key={lead.id}
                style={({ pressed }) => [
                  styles.pipelineRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push(`/leads/${lead.id}`)}
              >
                <View style={styles.pipelineMark}>
                  <Text style={styles.pipelineMarkText}>
                    {(lead.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {lead.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {lead.status?.name || 'No status'} ·{' '}
                    {formatRelative(lead.updatedAt)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.textMuted}
                />
              </Pressable>
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

function useFirstContent(screen: string, hasData: boolean, fetched: boolean) {
  useEffect(() => {
    if (hasData) markFirstContent(screen, !fetched);
  }, [screen, hasData, fetched]);
}

function kpiToneStyles(
  colors: ThemeColors,
  tone: KpiTile['tone']
): {
  accent: string;
  icon: string;
  iconBg: string;
  value: string;
  border: string;
} {
  switch (tone) {
    case 'brand':
      return {
        accent: colors.brand,
        icon: colors.brand,
        iconBg: colors.brandSoft,
        value: colors.text,
        border: colors.border,
      };
    case 'danger':
      return {
        accent: colors.danger,
        icon: colors.danger,
        iconBg: colors.dangerSoft,
        value: colors.danger,
        border: colors.dangerSoft,
      };
    case 'accent':
      return {
        accent: colors.brandMuted,
        icon: colors.brandMuted,
        iconBg: colors.primary50,
        value: colors.text,
        border: colors.border,
      };
    default:
      return {
        accent: colors.textMuted,
        icon: colors.textSecondary,
        iconBg: colors.surfaceMuted,
        value: colors.text,
        border: colors.border,
      };
  }
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screenContent: {
      gap: 16,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.sm,
    },
    pressed: { opacity: 0.85 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      minWidth: 0,
    },
    headerText: { flexShrink: 1, minWidth: 0, marginLeft: 10, gap: 2 },
    greeting: {
      ...typography.subtitle,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
    },
    roleLine: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    syncWarn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
      alignSelf: 'flex-start',
    },
    syncWarnText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.warning,
    },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    kpiTile: {
      width: '48.5%',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radii.md,
      paddingLeft: 16,
      paddingRight: 12,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 8,
      overflow: 'hidden',
      minHeight: 112,
    },
    kpiAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
    },
    kpiTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    kpiIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiValue: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.8,
      fontWeight: '700',
    },
    kpiLabel: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.2,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    sectionTitle: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    seeAllText: {
      ...typography.caption,
      color: colors.brand,
      fontWeight: '600',
    },

    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    inlineEmpty: {
      ...typography.caption,
      color: colors.textMuted,
      paddingVertical: 14,
      paddingHorizontal: 4,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowCopy: { flex: 1, gap: 2, minWidth: 0 },
    rowTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
    rowMeta: { ...typography.caption, color: colors.textMuted },

    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    timeCol: {
      width: 68,
      minHeight: 40,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeColDefault: { backgroundColor: colors.surfaceMuted },
    timeColWarn: { backgroundColor: colors.warningSoft },
    timeColText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontSize: 11,
      textAlign: 'center',
      lineHeight: 14,
    },
    timeColTextWarn: { color: colors.warning, fontWeight: '700' },
    overdueMark: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger,
    },

    pipelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    pipelineMark: {
      width: 36,
      height: 36,
      borderRadius: 6,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pipelineMarkText: {
      ...typography.subtitle,
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
