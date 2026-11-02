import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { Screen } from '@/components/ui/Screen';
import { HomeSkeleton } from '@/components/ui/skeletons';
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

type ScoreMetric = {
  key: string;
  label: string;
  value: number;
  href: Href;
  icon: IoniconName;
  emphasize?: boolean;
};

export default function HomeScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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
      <Screen header={homeHeader} contentStyle={styles.screenContent}>
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<HomeSkeleton />}
        />
      </Screen>
    );
  }

  const { kpis } = data;
  const focusTotal = kpis.todayFollowUps + kpis.overdueFollowUps;
  const queueClear = focusTotal === 0;

  const scoreMetrics: ScoreMetric[] = [
    {
      key: 'assigned',
      label: 'Leads',
      value: kpis.totalAssigned,
      href: '/(tabs)/leads',
      icon: 'people-outline',
    },
    {
      key: 'new',
      label: 'New 7d',
      value: kpis.newLeads,
      href: '/(tabs)/leads',
      icon: 'flash-outline',
    },
    {
      key: 'done',
      label: 'Done',
      value: kpis.completedActivities,
      href: '/activities',
      icon: 'checkmark-done-outline',
    },
  ];

  const queue = [...(data.upcomingFollowUps ?? [])]
    .sort((a, b) => {
      const aOver = isOverdue(a.dueAt) ? 0 : 1;
      const bOver = isOverdue(b.dueAt) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, 6);
  const recentLeads = data.recentLeads ?? [];

  return (
    <Screen
      header={homeHeader}
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      contentStyle={styles.screenContent}
    >
      {/* Day focus — full-width primary board */}
      <Pressable
        onPress={() => router.navigate('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.focusCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Today's focus: ${focusTotal} items`}
      >
        <View style={styles.focusTop}>
          <Text style={styles.focusEyebrow}>{"TODAY'S FOCUS"}</Text>
          <View style={styles.focusCta}>
            <Text style={styles.focusCtaText}>Queue</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={isDark ? colors.brand : colors.white}
            />
          </View>
        </View>
        <Text style={styles.focusValue}>{focusTotal}</Text>
        <Text style={styles.focusHint}>
          {queueClear
            ? 'Nothing urgent — you are clear for now'
            : `${kpis.todayFollowUps} due today · ${kpis.overdueFollowUps} overdue`}
        </Text>
        <View style={styles.focusSplit}>
          <View style={styles.focusSplitItem}>
            <Text style={styles.focusSplitValue}>{kpis.todayFollowUps}</Text>
            <Text style={styles.focusSplitLabel}>Due today</Text>
          </View>
          <View style={styles.focusSplitRule} />
          <View style={styles.focusSplitItem}>
            <Text
              style={[
                styles.focusSplitValue,
                kpis.overdueFollowUps > 0 && styles.focusSplitDanger,
              ]}
            >
              {kpis.overdueFollowUps}
            </Text>
            <Text style={styles.focusSplitLabel}>Overdue</Text>
          </View>
        </View>
      </Pressable>

      {/* Pipeline scoreboard — one panel, three columns */}
      <View style={styles.scoreBoard}>
        {scoreMetrics.map((metric, index) => (
          <Pressable
            key={metric.key}
            onPress={() => router.navigate(metric.href)}
            style={({ pressed }) => [
              styles.scoreCol,
              index > 0 && styles.scoreColBorder,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${metric.label}: ${metric.value}`}
          >
            <Ionicons
              name={metric.icon}
              size={15}
              color={isDark ? colors.textSecondary : colors.brand}
              style={styles.scoreIcon}
            />
            <Text style={styles.scoreValue}>{metric.value}</Text>
            <Text style={styles.scoreLabel}>{metric.label}</Text>
          </Pressable>
        ))}
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
          {recentLeads.length === 0 ? (
            <Text style={styles.inlineEmpty}>No recent lead activity.</Text>
          ) : (
            recentLeads.slice(0, 5).map((lead, index) => (
              <Pressable
                key={lead.id}
                style={({ pressed }) => [
                  styles.pipelineRow,
                  index > 0 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  if (!Number.isFinite(Number(lead.id))) return;
                  router.push(`/leads/${lead.id}`);
                }}
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

function createStyles(colors: ThemeColors, isDark: boolean) {
  const focusOnDark = {
    cardBg: colors.surface,
    cardBorder: colors.border,
    eyebrow: colors.textMuted,
    ctaBg: colors.brandSoft,
    ctaText: colors.brandMuted,
    value: colors.text,
    hint: colors.textSecondary,
    splitRule: colors.border,
    splitValue: colors.text,
    splitLabel: colors.textMuted,
    splitDanger: colors.warning,
  };
  const focusOnLight = {
    cardBg: colors.brand,
    cardBorder: colors.brand,
    eyebrow: 'rgba(255,255,255,0.78)',
    ctaBg: 'rgba(255,255,255,0.16)',
    ctaText: colors.white,
    value: colors.white,
    hint: 'rgba(255,255,255,0.88)',
    splitRule: 'rgba(255,255,255,0.28)',
    splitValue: colors.white,
    splitLabel: 'rgba(255,255,255,0.75)',
    splitDanger: '#FFE1A8',
  };
  const focus = isDark ? focusOnDark : focusOnLight;

  return StyleSheet.create({
    screenContent: {
      gap: 16,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.sm,
    },
    pressed: { opacity: 0.88 },

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

    focusCard: {
      backgroundColor: focus.cardBg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: focus.cardBorder,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 16,
    },
    focusTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    focusEyebrow: {
      ...typography.label,
      fontSize: 11,
      letterSpacing: 1,
      color: focus.eyebrow,
    },
    focusCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: focus.ctaBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.sm,
    },
    focusCtaText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: focus.ctaText,
    },
    focusValue: {
      fontSize: 44,
      lineHeight: 48,
      fontWeight: '700',
      letterSpacing: -1.2,
      color: focus.value,
    },
    focusHint: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: focus.hint,
      marginTop: 4,
      marginBottom: 14,
    },
    focusSplit: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: focus.splitRule,
      paddingTop: 12,
    },
    focusSplitItem: { flex: 1, gap: 2 },
    focusSplitValue: {
      ...typography.subtitle,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '700',
      color: focus.splitValue,
    },
    focusSplitDanger: { color: focus.splitDanger },
    focusSplitLabel: {
      ...typography.caption,
      fontSize: 12,
      color: focus.splitLabel,
    },
    focusSplitRule: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: focus.splitRule,
      marginHorizontal: 14,
    },

    scoreBoard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    scoreCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 4,
    },
    scoreColBorder: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
    },
    scoreIcon: { marginBottom: 2 },
    scoreValue: {
      ...typography.title,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.4,
      color: colors.text,
    },
    scoreLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
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
