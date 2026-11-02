import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { ChipScroll } from '@/components/ui/ChipScroll';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { markFirstContent } from '@/lib/perfMonitor';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDate, formatRelative } from '@/utils/dates';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type AlertTone = 'danger' | 'warn' | 'muted';
type AlertKey = 'overdue' | 'callSync' | 'today';

type AlertItem = {
  key: AlertKey;
  label: string;
  icon: IoniconName;
  tone: AlertTone;
  href: Href;
};

type Shortcut = {
  key: string;
  label: string;
  href: Href;
  icon: IoniconName;
  bg: string;
  border: string;
  fg: string;
};

const SHORTCUTS: Shortcut[] = [
  {
    key: 'leads',
    label: 'Leads',
    href: '/(tabs)/leads',
    icon: 'people',
    bg: '#FFE8EE',
    border: '#F9A8C4',
    fg: '#E11D48',
  },
  {
    key: 'followups',
    label: 'Follow-ups',
    href: '/(tabs)/follow-ups',
    icon: 'calendar',
    bg: '#FEF3C7',
    border: '#FCD34D',
    fg: '#C2410C',
  },
  {
    key: 'calls',
    label: 'Calls',
    href: '/(tabs)/calls',
    icon: 'call',
    bg: '#D1FAE5',
    border: '#6EE7B7',
    fg: '#0F766E',
  },
  {
    key: 'activity',
    label: 'Activity',
    href: '/activities',
    icon: 'list',
    bg: '#E0F2FE',
    border: '#7DD3FC',
    fg: '#0284C7',
  },
  {
    key: 'more',
    label: 'More',
    href: '/(tabs)/profile',
    icon: 'grid',
    bg: '#F3E8FF',
    border: '#D8B4FE',
    fg: '#7C3AED',
  },
];

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

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const callSync = useCallSyncStatus();
  const query = useQuery(dashboardQuery);
  const [dismissed, setDismissed] = useState<Set<AlertKey>>(new Set());

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

  const homeHeader = (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerLeft}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <UserAvatar
            uri={user?.profilePhoto}
            name={user?.name}
            size={40}
          />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>My pipeline</Text>
            </View>
            <View style={styles.syncChip}>
              <Ionicons
                name={syncOk ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={11}
                color={colors.textMuted}
              />
              <Text style={styles.syncChipText} numberOfLines={1}>
                {syncOk ? 'Call sync on' : 'Call sync off'}
              </Text>
            </View>
          </View>
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
  const focusTotal = kpis.todayFollowUps + kpis.overdueFollowUps;
  const attentionClear = focusTotal === 0;
  const pulsePct =
    kpis.pendingFollowUps <= 0
      ? 100
      : Math.round(
          ((kpis.pendingFollowUps - kpis.overdueFollowUps) /
            kpis.pendingFollowUps) *
            100
        );
  const pulseClamped = Math.max(0, Math.min(100, pulsePct));

  const alerts = (
    [
      kpis.overdueFollowUps > 0
        ? {
            key: 'overdue' as const,
            label: `${kpis.overdueFollowUps} overdue`,
            icon: 'time' as const,
            tone: 'danger' as const,
            href: '/(tabs)/follow-ups' as Href,
          }
        : null,
      kpis.todayFollowUps > 0
        ? {
            key: 'today' as const,
            label: `${kpis.todayFollowUps} due today`,
            icon: 'sunny' as const,
            tone: 'warn' as const,
            href: '/(tabs)/follow-ups' as Href,
          }
        : null,
      !syncOk
        ? {
            key: 'callSync' as const,
            label: 'Set up call sync',
            icon: 'sync-outline' as const,
            tone: 'muted' as const,
            href: '/call-sync/setup' as Href,
          }
        : null,
    ].filter(Boolean) as AlertItem[]
  ).filter((a) => !dismissed.has(a.key));

  const topFollowUps = data.upcomingFollowUps.slice(0, 2);

  return (
    <Screen
      header={homeHeader}
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      contentStyle={styles.screenContent}
    >
      {alerts.length > 0 ? (
        <ChipScroll padded={false} style={styles.alertsWrap}>
          {alerts.map((alert) => (
            <View
              key={alert.key}
              style={[
                styles.alertChip,
                alert.tone === 'danger' && styles.alertDanger,
                alert.tone === 'warn' && styles.alertWarn,
                alert.tone === 'muted' && styles.alertMuted,
              ]}
            >
              <Pressable
                onPress={() => router.push(alert.href)}
                style={styles.alertBody}
                accessibilityRole="button"
              >
                <Ionicons
                  name={alert.icon}
                  size={14}
                  color={
                    alert.tone === 'danger'
                      ? colors.danger
                      : alert.tone === 'warn'
                        ? '#B45309'
                        : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.alertLabel,
                    alert.tone === 'danger' && styles.alertLabelDanger,
                    alert.tone === 'warn' && styles.alertLabelWarn,
                  ]}
                  numberOfLines={1}
                >
                  {alert.label}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Dismiss"
                hitSlop={6}
                onPress={() =>
                  setDismissed((prev) => new Set(prev).add(alert.key))
                }
                style={styles.alertDismiss}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={
                    alert.tone === 'danger'
                      ? colors.danger
                      : alert.tone === 'warn'
                        ? '#92400E'
                        : '#4B5563'
                  }
                />
              </Pressable>
            </View>
          ))}
        </ChipScroll>
      ) : null}

      {/* Hero — Hisab SummaryCard pattern */}
      <View style={styles.hero}>
        <View style={styles.heroSheen} pointerEvents="none" />
        <View style={styles.heroTop}>
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>Today</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/follow-ups')}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.heroLink}>Open follow-ups</Text>
          </Pressable>
        </View>
        <Text style={styles.heroLabel}>Needs attention</Text>
        <Text style={styles.heroValue}>{focusTotal}</Text>
        <Text style={styles.heroHint}>
          {attentionClear
            ? 'You’re clear — no urgent follow-ups'
            : `${kpis.todayFollowUps} today · ${kpis.overdueFollowUps} overdue`}
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Assigned</Text>
            <Text style={styles.heroStatValue}>{kpis.totalAssigned}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>New (7d)</Text>
            <Text style={styles.heroStatValue}>{kpis.newLeads}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Activities</Text>
            <Text style={styles.heroStatValue}>{kpis.completedActivities}</Text>
          </View>
        </View>
      </View>

      {/* Pulse — BudgetPulse pattern → follow-up health */}
      <Pressable
        onPress={() => router.push('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.pulseHeader}>
          <Text style={styles.cardTitle}>Follow-up health</Text>
          <Text style={styles.pulsePct}>{pulseClamped}%</Text>
        </View>
        <View style={styles.pulseTrack}>
          <View
            style={[
              styles.pulseFill,
              {
                width: `${pulseClamped}%`,
                backgroundColor:
                  pulseClamped < 50
                    ? colors.danger
                    : pulseClamped < 80
                      ? colors.warning
                      : colors.success,
              },
            ]}
          />
        </View>
        <Text style={styles.pulseMeta}>
          {kpis.overdueFollowUps > 0
            ? `${kpis.overdueFollowUps} overdue of ${kpis.pendingFollowUps} pending`
            : kpis.pendingFollowUps > 0
              ? `${kpis.pendingFollowUps} pending · none overdue`
              : 'No pending follow-ups'}
        </Text>
      </Pressable>

      {/* Quick actions — chip row */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <ChipScroll padded={false}>
          {(
            [
              {
                key: 'leads',
                label: 'Leads',
                icon: 'people-outline' as const,
                href: '/(tabs)/leads' as Href,
              },
              {
                key: 'follow',
                label: 'Follow-ups',
                icon: 'calendar-outline' as const,
                href: '/(tabs)/follow-ups' as Href,
              },
              {
                key: 'calls',
                label: 'Calls',
                icon: 'call-outline' as const,
                href: '/(tabs)/calls' as Href,
              },
              {
                key: 'activity',
                label: 'Activity',
                icon: 'list-outline' as const,
                href: '/activities' as Href,
              },
              {
                key: 'sync',
                label: syncOk ? 'Call sync' : 'Set up sync',
                icon: 'sync-outline' as const,
                href: '/call-sync/setup' as Href,
              },
            ] as const
          ).map((chip) => (
            <Pressable
              key={chip.key}
              onPress={() => router.push(chip.href)}
              style={({ pressed }) => [
                styles.quickChip,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={chip.icon} size={16} color={colors.brand} />
              <Text style={styles.quickChipText}>{chip.label}</Text>
            </Pressable>
          ))}
        </ChipScroll>
      </View>

      {/* Needs attention snapshot — LedgerSnapshot pattern */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Needs attention</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/follow-ups')}
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
        <View style={styles.card}>
          <View style={styles.snapshotTotals}>
            <Pressable
              style={styles.snapshotCol}
              onPress={() => router.push('/(tabs)/follow-ups')}
            >
              <Text style={styles.snapshotLabel}>Today</Text>
              <Text style={styles.snapshotValue}>{kpis.todayFollowUps}</Text>
            </Pressable>
            <View style={styles.snapshotDivider} />
            <Pressable
              style={styles.snapshotCol}
              onPress={() => router.push('/(tabs)/follow-ups')}
            >
              <Text style={styles.snapshotLabel}>Overdue</Text>
              <Text
                style={[
                  styles.snapshotValue,
                  kpis.overdueFollowUps > 0 && styles.snapshotDanger,
                ]}
              >
                {kpis.overdueFollowUps}
              </Text>
            </Pressable>
          </View>
          {topFollowUps.length === 0 ? (
            <Text style={styles.inlineEmpty}>Nothing urgent right now.</Text>
          ) : (
            topFollowUps.map((item, idx) => {
              const overdue = isOverdue(item.dueAt);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                  style={({ pressed }) => [
                    styles.personRow,
                    idx === 0 && styles.personRowBorder,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.listCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.leadName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.type || 'Follow-up'} · {formatDate(item.dueAt)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dueTag,
                      overdue ? styles.dueTagWarn : styles.dueTagOk,
                    ]}
                  >
                    {overdue ? 'Overdue' : 'Due'}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* Shortcuts — pastel tiles */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shortcuts</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            hitSlop={6}
            style={styles.organize}
          >
            <Ionicons name="options-outline" size={13} color={colors.textMuted} />
            <Text style={styles.organizeText}>More</Text>
          </Pressable>
        </View>
        <View style={styles.shortcutGrid}>
          {SHORTCUTS.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => router.push(item.href)}
              style={({ pressed }) => [
                styles.shortcutItem,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.shortcutIcon,
                  { backgroundColor: item.bg, borderColor: item.border },
                ]}
              >
                <Ionicons name={item.icon} size={24} color={item.fg} />
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Upcoming list */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming follow-ups</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/follow-ups')}
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
        <View style={styles.card}>
          {data.upcomingFollowUps.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No upcoming follow-ups"
              message="Schedule the next touch from a lead."
              actionLabel="Browse leads"
              onAction={() => router.push('/(tabs)/leads')}
            />
          ) : (
            data.upcomingFollowUps.slice(0, 5).map((item, index) => {
              const overdue = isOverdue(item.dueAt);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.listRow,
                    index === 0 && styles.listRowFirst,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                >
                  <View
                    style={[
                      styles.timeChip,
                      overdue ? styles.timeChipWarn : styles.timeChipDefault,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        overdue && styles.timeChipTextWarn,
                      ]}
                      numberOfLines={2}
                    >
                      {formatDate(item.dueAt)}
                    </Text>
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.leadName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.type || 'Follow-up'}
                      {item.leadPhone ? ` · ${item.leadPhone}` : ''}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.textMuted}
                  />
                </Pressable>
              );
            })
          )}
        </View>
      </View>

      {/* Recent leads */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent lead updates</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/leads')}
            hitSlop={6}
            style={styles.seeAll}
          >
            <Text style={styles.seeAllText}>All leads</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.brand} />
          </Pressable>
        </View>
        <View style={styles.card}>
          {data.recentLeads.length === 0 ? (
            <Text style={styles.inlineEmpty}>No recent leads.</Text>
          ) : (
            data.recentLeads.slice(0, 5).map((lead, index) => (
              <Pressable
                key={lead.id}
                style={({ pressed }) => [
                  styles.listRow,
                  index === 0 && styles.listRowFirst,
                  pressed && styles.pressed,
                ]}
                onPress={() => router.push(`/leads/${lead.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(lead.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.listCopy}>
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

const styles = StyleSheet.create({
  screenContent: {
    gap: 12,
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
  headerText: { flexShrink: 1, minWidth: 0, marginLeft: 10 },
  greeting: {
    ...typography.subtitle,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  metaChip: {
    backgroundColor: '#E4E9F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  metaChipText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    color: colors.text,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.pill,
    maxWidth: 140,
  },
  syncChipText: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    flexShrink: 1,
  },

  alertsWrap: { marginBottom: 0 },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 0.5,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 6,
    gap: 2,
  },
  alertDanger: { backgroundColor: '#FEE4E2', borderColor: '#FECDCA' },
  alertWarn: { backgroundColor: '#FEF0C7', borderColor: '#FEDF89' },
  alertMuted: { backgroundColor: '#F3F4F6', borderColor: colors.border },
  alertBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
  },
  alertLabel: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text,
  },
  alertLabelDanger: { color: colors.danger, fontWeight: '600' },
  alertLabelWarn: { color: '#B45309', fontWeight: '600' },
  alertDismiss: { padding: 4 },

  hero: {
    backgroundColor: colors.brandMuted,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  heroSheen: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -40,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  periodPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  periodText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  heroLink: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  heroLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  heroValue: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.white,
  },
  heroHint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    marginBottom: 12,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 12,
  },
  heroStat: { flex: 1, gap: 2 },
  heroStatLabel: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  heroStatValue: {
    ...typography.subtitle,
    fontSize: 16,
    color: colors.white,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 8,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pulsePct: { ...typography.subtitle, color: colors.text, fontSize: 15 },
  pulseTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  pulseFill: { height: '100%', borderRadius: radii.pill },
  pulseMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 8,
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
  organize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  organizeText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickChipText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },

  snapshotTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  snapshotCol: { flex: 1, gap: 2 },
  snapshotLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  snapshotValue: {
    ...typography.title,
    fontSize: 24,
    color: colors.text,
  },
  snapshotDanger: { color: colors.danger },
  snapshotDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  inlineEmpty: {
    ...typography.caption,
    color: colors.textMuted,
    paddingTop: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  personRowBorder: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dueTag: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  dueTagWarn: { backgroundColor: colors.warningSoft, color: colors.warning },
  dueTagOk: { backgroundColor: colors.brandSoft, color: colors.brand },

  shortcutGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shortcutItem: {
    width: '19%',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shortcutLabel: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.text,
    textAlign: 'center',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listRowFirst: { borderTopWidth: 0, paddingTop: spacing.xs },
  listCopy: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
  rowMeta: { ...typography.caption, color: colors.textMuted },
  timeChip: {
    width: 72,
    minHeight: 44,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipDefault: { backgroundColor: colors.surfaceMuted },
  timeChipWarn: { backgroundColor: colors.warningSoft },
  timeChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  timeChipTextWarn: { color: colors.warning },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.subtitle,
    color: colors.brand,
    fontSize: 15,
  },
});
