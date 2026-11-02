import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { markFirstContent } from '@/lib/perfMonitor';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDate, formatRelative } from '@/utils/dates';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const callSync = useCallSyncStatus();
  const query = useQuery(dashboardQuery);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
    }, [callSync.refresh])
  );

  const firstName = user?.name?.split(' ')[0] || 'Agent';
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const syncOk =
    callSync.status === 'configured' || callSync.status === 'unavailable_web';

  const homeHeader = (
    <ScreenHeader
      title="Home"
      showBack={false}
      right={<NotificationBell plain />}
    />
  );

  const data = query.data;
  useFirstContent('home', query.data !== undefined, query.isFetchedAfterMount);

  // Cached data always wins over loading / error / offline states.
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
  const hasOverdue = kpis.overdueFollowUps > 0;
  const focusTotal = kpis.todayFollowUps + kpis.overdueFollowUps;

  return (
    <Screen
      header={homeHeader}
      scroll
      refreshing={query.isRefetching}
      onRefresh={() => query.refetch()}
      contentStyle={styles.screenContent}
    >
      <View style={styles.intro}>
        <Text style={styles.greeting}>
          {greeting}, {firstName}
        </Text>
        <Text style={styles.subtitle}>
          {focusTotal > 0
            ? `${focusTotal} follow-up${focusTotal === 1 ? '' : 's'} need attention today.`
            : 'Your pipeline looks clear — keep momentum going.'}
        </Text>
      </View>

      {hasOverdue ? (
        <Pressable
          style={styles.alertBanner}
          onPress={() => router.push('/(tabs)/follow-ups')}
        >
          <View style={styles.alertIcon}>
            <FontAwesome name="exclamation" size={14} color={colors.warning} />
          </View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>
              {kpis.overdueFollowUps} overdue follow-up
              {kpis.overdueFollowUps === 1 ? '' : 's'}
            </Text>
            <Text style={styles.alertBody}>Tap to clear them now</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={colors.warning} />
        </Pressable>
      ) : null}

      <View style={styles.focusRow}>
        <FocusStat
          label="Today"
          value={kpis.todayFollowUps}
          icon="calendar"
          onPress={() => router.push('/(tabs)/follow-ups')}
        />
        <FocusStat
          label="Overdue"
          value={kpis.overdueFollowUps}
          icon="clock-o"
          tone={hasOverdue ? 'warning' : 'default'}
          onPress={() => router.push('/(tabs)/follow-ups')}
        />
        <FocusStat
          label="Pending"
          value={kpis.pendingFollowUps}
          icon="hourglass-half"
          onPress={() => router.push('/(tabs)/follow-ups')}
        />
      </View>

      <View style={styles.kpiStrip}>
        <MiniKpi
          label="Assigned"
          value={kpis.totalAssigned}
          onPress={() => router.push('/(tabs)/leads')}
        />
        <View style={styles.kpiDivider} />
        <MiniKpi label="New (7d)" value={kpis.newLeads} />
        <View style={styles.kpiDivider} />
        <MiniKpi
          label="Activities"
          value={kpis.completedActivities}
          onPress={() => router.push('/activities')}
        />
      </View>

      <View style={styles.actionsRow}>
        <QuickAction
          icon="users"
          label="Leads"
          onPress={() => router.push('/(tabs)/leads')}
        />
        <QuickAction
          icon="calendar-check-o"
          label="Follow-ups"
          onPress={() => router.push('/(tabs)/follow-ups')}
        />
        <QuickAction
          icon="phone"
          label="Calls"
          onPress={() => router.push('/(tabs)/calls')}
        />
        <QuickAction
          icon="list-alt"
          label="Activity"
          onPress={() => router.push('/activities')}
        />
      </View>

      <Pressable
        style={[styles.syncCard, syncOk ? styles.syncCardOk : styles.syncCardWarn]}
        onPress={() => router.push('/call-sync/setup')}
      >
        <View
          style={[
            styles.syncDot,
            { backgroundColor: syncOk ? colors.success : colors.warning },
          ]}
        />
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle}>Call sync · {callSync.label}</Text>
          <Text style={styles.syncBody} numberOfLines={1}>
            {callSync.message}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={12} color={colors.textMuted} />
      </Pressable>

      <Section
        title="Upcoming follow-ups"
        actionLabel="See all"
        onAction={() => router.push('/(tabs)/follow-ups')}
      >
        {data.upcomingFollowUps.length === 0 ? (
          <Text style={styles.emptyCopy}>No pending follow-ups.</Text>
        ) : (
          data.upcomingFollowUps.slice(0, 5).map((item, index) => {
            const overdue = isOverdue(item.dueAt);
            return (
              <Pressable
                key={item.id}
                style={[styles.listRow, index === 0 && styles.listRowFirst]}
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
                      overdue ? styles.timeChipTextWarn : null,
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
                <FontAwesome
                  name="chevron-right"
                  size={12}
                  color={colors.textMuted}
                />
              </Pressable>
            );
          })
        )}
      </Section>

      <Section
        title="Recent lead updates"
        actionLabel="All leads"
        onAction={() => router.push('/(tabs)/leads')}
      >
        {data.recentLeads.length === 0 ? (
          <Text style={styles.emptyCopy}>No recent leads.</Text>
        ) : (
          data.recentLeads.slice(0, 5).map((lead, index) => (
            <Pressable
              key={lead.id}
              style={[styles.listRow, index === 0 && styles.listRowFirst]}
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
              <FontAwesome
                name="chevron-right"
                size={12}
                color={colors.textMuted}
              />
            </Pressable>
          ))
        )}
      </Section>
    </Screen>
  );
}

/** Dev metric: when a screen first had content, and whether it came from cache. */
function useFirstContent(screen: string, hasData: boolean, fetched: boolean) {
  useEffect(() => {
    if (hasData) markFirstContent(screen, !fetched);
  }, [screen, hasData, fetched]);
}

function FocusStat({
  label,
  value,
  icon,
  tone = 'default',
  onPress,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  tone?: 'default' | 'warning';
  onPress: () => void;
}) {
  const warning = tone === 'warning';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.focusCard,
        warning && styles.focusCardWarn,
        pressed && styles.pressed,
      ]}
    >
      <FontAwesome
        name={icon}
        size={16}
        color={warning ? colors.warning : colors.brand}
      />
      <Text style={[styles.focusValue, warning && styles.focusValueWarn]}>
        {value}
      </Text>
      <Text style={styles.focusLabel}>{label}</Text>
    </Pressable>
  );
}

function MiniKpi({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.miniKpi}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.miniKpi, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <FontAwesome name={icon} size={16} color={colors.brand} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.panelAction}>{actionLabel}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { gap: spacing.md, paddingBottom: spacing.xxl },
  intro: { gap: 4, marginBottom: spacing.xs },
  greeting: { ...typography.display, color: colors.text, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.textSecondary },
  pressed: { opacity: 0.85 },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#F5D08A',
    padding: spacing.md,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCopy: { flex: 1, gap: 2 },
  alertTitle: { ...typography.subtitle, color: colors.warning, fontSize: 14 },
  alertBody: { ...typography.caption, color: colors.textSecondary },

  focusRow: { flexDirection: 'row', gap: spacing.sm },
  focusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  focusCardWarn: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F5D08A',
  },
  focusValue: { ...typography.title, color: colors.text, fontSize: 22 },
  focusValueWarn: { color: colors.warning },
  focusLabel: { ...typography.caption, color: colors.textSecondary },

  kpiStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  miniKpi: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  miniValue: { ...typography.subtitle, color: colors.text, fontSize: 18 },
  miniLabel: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  kpiDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  syncCardOk: {
    backgroundColor: colors.successSoft,
    borderColor: '#A6F4C5',
  },
  syncCardWarn: {
    backgroundColor: colors.warningSoft,
    borderColor: '#F5D08A',
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  syncCopy: { flex: 1, gap: 2 },
  syncTitle: { ...typography.subtitle, color: colors.text, fontSize: 14 },
  syncBody: { ...typography.caption, color: colors.textSecondary },

  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 0,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  panelTitle: { ...typography.subtitle, color: colors.text },
  panelAction: { ...typography.caption, color: colors.brandMuted },
  emptyCopy: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.sm,
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
  listCopy: { flex: 1, gap: 2 },
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
