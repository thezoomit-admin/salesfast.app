import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { HomeReports } from '@/components/home/HomeReports';
import { Search02Icon } from '@/components/icons/hugeicons';
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
import { formatRelative, parseDate } from '@/utils/dates';

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type QueueTone = 'overdue' | 'dueToday' | 'upcoming';

const FOLLOWUP_TYPE_LABEL: Record<string, string> = {
  OFFICE_VISIT: 'Office visit',
  SITE_VISIT: 'Site visit',
  FOLLOW_UP: 'Follow-up',
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
};

const FOLLOWUP_TYPE_ICON: Record<string, IoniconName> = {
  OFFICE_VISIT: 'business-outline',
  SITE_VISIT: 'location-outline',
  FOLLOW_UP: 'calendar-outline',
  CALL: 'call-outline',
  WHATSAPP: 'logo-whatsapp',
};

function followupTypeLabel(type?: string | null) {
  if (!type) return 'Follow-up';
  return FOLLOWUP_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

function followupTypeIcon(type?: string | null): IoniconName {
  if (!type) return 'calendar-outline';
  return FOLLOWUP_TYPE_ICON[type] ?? 'calendar-outline';
}

function queueTone(dueAt: string) {
  const due = parseDate(dueAt);
  if (!due) return 'upcoming' as const;
  if (due.getTime() < Date.now()) return 'overdue' as const;
  if (isToday(due)) return 'dueToday' as const;
  return 'upcoming' as const;
}

function queueDayLabel(dueAt: string) {
  const due = parseDate(dueAt);
  if (!due) return '—';
  if (isToday(due)) return 'Today';
  if (isTomorrow(due)) return 'Tomorrow';
  return format(due, 'dd MMM');
}

function queueTimeLabel(dueAt: string) {
  const due = parseDate(dueAt);
  if (!due) return '—';
  return format(due, 'h:mm a');
}

function queueStatusLabel(tone: QueueTone) {
  if (tone === 'overdue') return 'Overdue';
  if (tone === 'dueToday') return 'Due today';
  return 'Upcoming';
}

type ScoreTone = {
  accent: string;
  soft: string;
  iconFg: string;
};

type ScoreMetric = {
  key: string;
  label: string;
  unit: string;
  value: number;
  href: Href;
  icon: IoniconName;
  tone: ScoreTone;
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

  const displayName = user?.name?.trim() || 'Agent';
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
      label: 'Assigned',
      unit: kpis.totalAssigned === 1 ? 'lead' : 'leads',
      value: kpis.totalAssigned,
      href: '/(tabs)/leads',
      icon: 'people',
      tone: {
        accent: colors.success,
        soft: colors.successSoft,
        iconFg: colors.white,
      },
    },
    {
      key: 'new',
      label: 'This week',
      unit: 'new',
      value: kpis.newLeads,
      href: '/(tabs)/leads',
      icon: 'flash',
      tone: {
        accent: colors.brand,
        soft: isDark ? colors.brandSoft : colors.primary50,
        iconFg: colors.white,
      },
    },
    {
      key: 'due',
      label: 'Follow-ups',
      unit: 'today',
      value: kpis.todayFollowUps,
      href: '/(tabs)/follow-ups',
      icon: 'time',
      tone: {
        accent: isDark ? '#60A5FA' : '#2563EB',
        soft: isDark ? '#0B1F3A' : '#EFF6FF',
        iconFg: colors.white,
      },
    },
    {
      key: 'done',
      label: 'Activities',
      unit: 'done',
      value: kpis.completedActivities,
      href: '/activities',
      icon: 'checkmark-done',
      tone: {
        accent: colors.warning,
        soft: colors.warningSoft,
        iconFg: colors.white,
      },
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
      {/* Day focus — analytics-style hero card */}
      <Pressable
        onPress={() => router.navigate('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.focusCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Today's focus: ${focusTotal} items`}
      >
        <View style={styles.focusTop}>
          <View style={styles.focusTitleRow}>
            <Text style={styles.focusTitle}>{"Today's focus"}</Text>
            {!queueClear ? (
              <View
                style={[
                  styles.focusBadge,
                  kpis.overdueFollowUps > 0
                    ? styles.focusBadgeWarn
                    : styles.focusBadgeOk,
                ]}
              >
                <Text
                  style={[
                    styles.focusBadgeText,
                    kpis.overdueFollowUps > 0
                      ? styles.focusBadgeTextWarn
                      : styles.focusBadgeTextOk,
                  ]}
                >
                  {kpis.overdueFollowUps > 0
                    ? `${kpis.overdueFollowUps} overdue`
                    : 'On track'}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.focusArrowBtn}>
            <Ionicons
              name="arrow-up-outline"
              size={16}
              color={colors.text}
              style={styles.focusArrowIcon}
            />
          </View>
        </View>

        <View style={styles.focusBody}>
          <View style={styles.focusCopy}>
            <Text style={styles.focusValue}>{focusTotal}</Text>
            <Text style={styles.focusHint}>
              {queueClear
                ? 'Nothing urgent — you are clear for now'
                : `${kpis.todayFollowUps} due today · ${kpis.overdueFollowUps} overdue`}
            </Text>
          </View>

          <View style={styles.focusChart}>
            {(
              [
                {
                  key: 'due',
                  label: 'Due',
                  value: kpis.todayFollowUps,
                  active: true,
                },
                {
                  key: 'late',
                  label: 'Late',
                  value: kpis.overdueFollowUps,
                  active: false,
                },
                {
                  key: 'new',
                  label: 'New',
                  value: kpis.newLeads,
                  active: false,
                },
                {
                  key: 'done',
                  label: 'Done',
                  value: kpis.completedActivities,
                  active: false,
                },
              ] as const
            ).map((bar) => {
              const max = Math.max(
                kpis.todayFollowUps,
                kpis.overdueFollowUps,
                kpis.newLeads,
                kpis.completedActivities,
                1
              );
              const h = Math.max(14, Math.round((bar.value / max) * 56));
              return (
                <View key={bar.key} style={styles.focusBarCol}>
                  <View
                    style={[
                      styles.focusBar,
                      {
                        height: h,
                        backgroundColor: bar.active
                          ? colors.brand
                          : colors.brandSoft,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.focusBarLabel,
                      bar.active && styles.focusBarLabelActive,
                    ]}
                  >
                    {bar.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.focusFooter}>
          <View style={styles.focusAvatarStack}>
            {recentLeads.slice(0, 3).map((lead, i) => (
              <View
                key={lead.id}
                style={[
                  styles.focusAvatar,
                  {
                    marginLeft: i === 0 ? 0 : -8,
                    zIndex: 3 - i,
                    backgroundColor:
                      ['#0F766E', '#F2461C', '#D97706'][i] ?? colors.brand,
                  },
                ]}
              >
                <Text style={styles.focusAvatarText}>
                  {(lead.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {recentLeads.length > 3 ? (
              <View
                style={[
                  styles.focusAvatar,
                  styles.focusAvatarMore,
                  { marginLeft: -8 },
                ]}
              >
                <Text style={styles.focusAvatarMoreText}>
                  +{Math.min(recentLeads.length - 3, 99)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.focusFooterLink}>View queue</Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.brand}
          />
        </View>
      </Pressable>

      {/* Pipeline scoreboard — 2×2 metric cards */}
      <View style={styles.scoreBoard}>
        {scoreMetrics.map((metric) => (
          <Pressable
            key={metric.key}
            onPress={() => router.navigate(metric.href)}
            style={({ pressed }) => [
              styles.scoreCard,
              { backgroundColor: metric.tone.soft },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${metric.label}: ${metric.value}`}
          >
            <Ionicons
              name={metric.icon}
              size={72}
              color={metric.tone.accent}
              style={styles.scoreWatermark}
            />
            <View
              style={[
                styles.scoreIconWrap,
                { backgroundColor: metric.tone.accent },
              ]}
            >
              <Ionicons
                name={metric.icon}
                size={16}
                color={metric.tone.iconFg}
              />
            </View>
            <View style={styles.scoreValueRow}>
              <Text style={styles.scoreValue}>{metric.value}</Text>
              <Text
                style={[styles.scoreUnit, { color: metric.tone.accent }]}
              >
                {metric.unit}
              </Text>
            </View>
            <Text style={styles.scoreLabel}>{metric.label}</Text>
          </Pressable>
        ))}
      </View>

      <HomeReports kpis={kpis} recentLeads={recentLeads} />

      {/* Today's queue — agenda cards */}
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
        {queue.length === 0 ? (
          <View style={styles.panel}>
            <EmptyState
              icon="checkmark-circle-outline"
              title="Queue is clear"
              message="No follow-ups lined up. Pick a lead and schedule the next touch."
              actionLabel="Browse leads"
              onAction={() => router.navigate('/(tabs)/leads')}
            />
          </View>
        ) : (
          <View style={styles.queueList}>
            {queue.map((item) => {
              const tone = queueTone(item.dueAt);
              const toneStyle =
                tone === 'overdue'
                  ? {
                      accent: colors.danger,
                      chipBg: colors.dangerSoft,
                      chipFg: colors.danger,
                      timeBg: colors.dangerSoft,
                      timeFg: colors.danger,
                    }
                  : tone === 'dueToday'
                    ? {
                        accent: colors.warning,
                        chipBg: colors.warningSoft,
                        chipFg: colors.warning,
                        timeBg: colors.warningSoft,
                        timeFg: colors.warning,
                      }
                    : {
                        accent: colors.brand,
                        chipBg: colors.primary50,
                        chipFg: colors.brand,
                        timeBg: colors.surfaceMuted,
                        timeFg: colors.textSecondary,
                      };

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.queueCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.leadName}, ${queueStatusLabel(tone)}, ${queueTimeLabel(item.dueAt)}`}
                >
                  <View
                    style={[
                      styles.queueAccent,
                      { backgroundColor: toneStyle.accent },
                    ]}
                  />
                  <View style={styles.queueCardBody}>
                    <View style={styles.queueCardTop}>
                      <View
                        style={[
                          styles.queueTimeBlock,
                          { backgroundColor: toneStyle.timeBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.queueTime,
                            { color: toneStyle.timeFg },
                          ]}
                          numberOfLines={1}
                        >
                          {queueTimeLabel(item.dueAt)}
                        </Text>
                        <Text
                          style={[
                            styles.queueDay,
                            { color: toneStyle.timeFg },
                          ]}
                          numberOfLines={1}
                        >
                          {queueDayLabel(item.dueAt)}
                        </Text>
                      </View>
                      <View style={styles.queueMain}>
                        <View style={styles.queueTitleRow}>
                          <Text style={styles.queueLeadName} numberOfLines={1}>
                            {item.leadName}
                          </Text>
                          <View
                            style={[
                              styles.queueStatusChip,
                              { backgroundColor: toneStyle.chipBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.queueStatusText,
                                { color: toneStyle.chipFg },
                              ]}
                            >
                              {queueStatusLabel(tone)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.queueMetaRow}>
                          <Ionicons
                            name={followupTypeIcon(item.type)}
                            size={13}
                            color={colors.textMuted}
                          />
                          <Text style={styles.queueMeta} numberOfLines={1}>
                            {followupTypeLabel(item.type)}
                            {item.leadPhone ? ` · ${item.leadPhone}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textMuted}
                    style={styles.queueChevron}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
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

function createStyles(colors: ThemeColors, _isDark: boolean) {
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

    focusCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 16,
    },
    focusTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    focusTitleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    focusTitle: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    focusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.pill,
      flexShrink: 0,
    },
    focusBadgeOk: { backgroundColor: colors.successSoft },
    focusBadgeWarn: { backgroundColor: colors.warningSoft },
    focusBadgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    focusBadgeTextOk: { color: colors.success },
    focusBadgeTextWarn: { color: colors.warning },
    focusArrowBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusArrowIcon: {
      transform: [{ rotate: '45deg' }],
    },
    focusBody: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    focusCopy: {
      flex: 1,
      gap: 6,
      minWidth: 0,
      paddingBottom: 2,
    },
    focusValue: {
      fontSize: 44,
      lineHeight: 48,
      fontWeight: '700',
      letterSpacing: -1.2,
      color: colors.text,
    },
    focusHint: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    focusChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 76,
    },
    focusBarCol: {
      width: 24,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      height: '100%',
    },
    focusBar: {
      width: 16,
      borderRadius: 8,
      marginTop: 'auto',
    },
    focusBarLabel: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '600',
      color: colors.textMuted,
    },
    focusBarLabelActive: {
      color: colors.brand,
    },
    focusFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 2,
    },
    focusAvatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 4,
    },
    focusAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    focusAvatarText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    focusAvatarMore: {
      backgroundColor: colors.successSoft,
    },
    focusAvatarMoreText: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '700',
      color: colors.success,
    },
    focusFooterLink: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      color: colors.brand,
      marginLeft: 'auto',
    },

    scoreBoard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    scoreCard: {
      width: '48.5%',
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      overflow: 'hidden',
      minHeight: 118,
      gap: 10,
    },
    scoreWatermark: {
      position: 'absolute',
      right: -6,
      top: 18,
      opacity: 0.14,
    },
    scoreIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 5,
      marginTop: 2,
    },
    scoreValue: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: -0.6,
      color: colors.text,
    },
    scoreUnit: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '700',
    },
    scoreLabel: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '500',
      color: colors.textMuted,
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

    queueList: { gap: 8 },
    queueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      minHeight: 72,
    },
    queueAccent: {
      width: 3,
      alignSelf: 'stretch',
    },
    queueCardBody: {
      flex: 1,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 4,
      minWidth: 0,
    },
    queueCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    queueTimeBlock: {
      width: 72,
      borderRadius: radii.sm,
      paddingHorizontal: 8,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    queueTime: {
      ...typography.subtitle,
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
    queueDay: {
      ...typography.caption,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      opacity: 0.9,
    },
    queueMain: { flex: 1, minWidth: 0, gap: 4 },
    queueTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    queueLeadName: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
      minWidth: 0,
    },
    queueStatusChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      flexShrink: 0,
    },
    queueStatusText: {
      ...typography.caption,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    queueMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      minWidth: 0,
    },
    queueMeta: {
      ...typography.caption,
      flex: 1,
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
      minWidth: 0,
    },
    queueChevron: { marginRight: 10, flexShrink: 0 },

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
