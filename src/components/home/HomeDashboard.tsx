import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, type Href } from 'expo-router';
import { format } from 'date-fns/format';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { radii, typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type Kpis = MobileDashboard['kpis'];
type RecentLead = MobileDashboard['recentLeads'][number];
type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  kpis: Kpis;
  recentLeads: RecentLead[];
  queue: QueueItem[];
  firstName: string;
};

type KpiCard = {
  key: string;
  label: string;
  value: number;
  badge: string;
  href: Href;
  icon: IoniconName;
  accent: string;
  soft: string;
};

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function ProgressRing({
  progress,
  size,
  stroke,
  track,
  children,
}: {
  progress: number;
  size: number;
  stroke: string;
  track: string;
  children?: ReactNode;
}) {
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, progress));
  const offset = c * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function HomeDashboard({ kpis, recentLeads, queue, firstName }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const focusTotal = kpis.todayFollowUps + kpis.overdueFollowUps;
  const completionTotal = kpis.pendingFollowUps + kpis.completedActivities;
  const completionRate =
    completionTotal <= 0
      ? 100
      : Math.round((kpis.completedActivities / completionTotal) * 100);
  const clearRate =
    focusTotal <= 0
      ? 100
      : Math.round(
          (kpis.todayFollowUps / Math.max(focusTotal, 1)) * 100
        );

  const todayLabel = format(new Date(), 'EEEE, d MMM yyyy');
  const greeting = `${greetingForHour(new Date().getHours())}, ${firstName}`;

  const kpiCards: KpiCard[] = [
    {
      key: 'due',
      label: 'Due today',
      value: kpis.todayFollowUps,
      badge: focusTotal > 0 ? `${kpis.todayFollowUps} live` : 'Clear',
      href: '/(tabs)/follow-ups',
      icon: 'time-outline',
      accent: colors.brand,
      soft: isDark ? colors.brandSoft : colors.primary50,
    },
    {
      key: 'assigned',
      label: 'Assigned leads',
      value: kpis.totalAssigned,
      badge: `${kpis.totalAssigned} total`,
      href: '/(tabs)/leads',
      icon: 'people-outline',
      accent: colors.success,
      soft: colors.successSoft,
    },
    {
      key: 'new',
      label: 'New this week',
      value: kpis.newLeads,
      badge: 'Last 7 days',
      href: '/(tabs)/leads',
      icon: 'flash-outline',
      accent: isDark ? '#60A5FA' : '#2563EB',
      soft: isDark ? '#0B1F3A' : '#EFF6FF',
    },
    {
      key: 'done',
      label: 'Activities done',
      value: kpis.completedActivities,
      badge: 'Completed',
      href: '/activities',
      icon: 'checkmark-done-outline',
      accent: colors.warning,
      soft: colors.warningSoft,
    },
  ];

  const mixMax = Math.max(
    kpis.todayFollowUps,
    kpis.overdueFollowUps,
    kpis.newLeads,
    kpis.completedActivities,
    1
  );

  const go = (href: Href) => router.navigate(href);

  return (
    <View style={styles.root}>
      {/* Greeting + primary CTA */}
      <View style={styles.greetingBlock}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.dateLine}>{todayLabel}</Text>
      </View>

      <Pressable
        onPress={() => go('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Open follow-ups"
      >
        <Text style={styles.ctaText}>Open follow-ups</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </Pressable>

      {/* 2×2 KPI strip */}
      <View style={styles.kpiGrid}>
        {kpiCards.map((card) => (
          <Pressable
            key={card.key}
            onPress={() => go(card.href)}
            style={({ pressed }) => [styles.kpiCard, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${card.label}: ${card.value}`}
          >
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIcon, { backgroundColor: card.soft }]}>
                <Ionicons name={card.icon} size={16} color={card.accent} />
              </View>
              <View style={[styles.kpiBadge, { backgroundColor: card.soft }]}>
                <Text style={[styles.kpiBadgeText, { color: card.accent }]}>
                  {card.badge}
                </Text>
              </View>
            </View>
            <Text style={styles.kpiValue}>{card.value}</Text>
            <Text style={styles.kpiLabel}>{card.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Live monitoring */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Live queue monitoring</Text>
        <Pressable onPress={() => go('/(tabs)/follow-ups')} hitSlop={6}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => go('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Live queue, ${focusTotal} items`}
      >
        <ProgressRing
          progress={clearRate}
          size={92}
          stroke={colors.white}
          track="rgba(255,255,255,0.22)"
        >
          <Text style={styles.ringValue}>{focusTotal}</Text>
          <Text style={styles.ringHint}>
            {focusTotal === 0 ? 'clear' : 'active'}
          </Text>
        </ProgressRing>

        <View style={styles.liveCopy}>
          <Text style={styles.liveEyebrow}>TODAY&apos;S FOCUS</Text>
          <Text style={styles.liveTitle}>
            {focusTotal === 0
              ? 'You are all clear'
              : `${kpis.todayFollowUps} due · ${kpis.overdueFollowUps} overdue`}
          </Text>
          <Text style={styles.liveMeta}>
            {kpis.pendingFollowUps} pending follow-ups in your queue
          </Text>
          <View style={styles.liveAvatars}>
            {recentLeads.slice(0, 3).map((lead, i) => (
              <View
                key={lead.id}
                style={[
                  styles.liveAvatar,
                  {
                    marginLeft: i === 0 ? 0 : -8,
                    zIndex: 3 - i,
                    backgroundColor:
                      ['#0F766E', '#FFFFFF33', '#FDBA74'][i] ?? '#FFFFFF33',
                  },
                ]}
              >
                <Text style={styles.liveAvatarText}>
                  {(lead.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            <Text style={styles.liveAvatarLabel}>
              {recentLeads.length > 0
                ? `${Math.min(recentLeads.length, 12)} recent`
                : 'No recent leads'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Insight cards */}
      <Pressable
        onPress={() => go('/activities')}
        style={({ pressed }) => [styles.insightCard, pressed && styles.pressed]}
      >
        <View style={styles.insightHeader}>
          <Text style={styles.insightTitle}>Follow-up completion</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        <View style={styles.insightRow}>
          <View style={styles.insightStat}>
            <Text style={styles.insightValue}>{completionRate}%</Text>
            <Text style={styles.insightCaption}>Completion rate</Text>
          </View>
          <View style={styles.insightStat}>
            <Text style={[styles.insightValue, { color: colors.success }]}>
              {kpis.completedActivities}
            </Text>
            <Text style={styles.insightCaption}>Activities done</Text>
          </View>
          <View style={styles.insightStat}>
            <Text style={styles.insightValue}>{kpis.pendingFollowUps}</Text>
            <Text style={styles.insightCaption}>Still open</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, completionRate)}%`,
                backgroundColor: colors.success,
              },
            ]}
          />
        </View>
      </Pressable>

      <Pressable
        onPress={() => go('/(tabs)/follow-ups')}
        style={({ pressed }) => [styles.insightCard, pressed && styles.pressed]}
      >
        <View style={styles.insightHeader}>
          <Text style={styles.insightTitle}>Overdue pressure</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        <View style={styles.alertRow}>
          <View style={styles.alertCopy}>
            <Text style={styles.alertLabel}>Leads needing attention</Text>
            <Text style={styles.alertHint}>
              {kpis.overdueFollowUps > 0
                ? 'Clear overdue items before they go cold.'
                : 'No overdue follow-ups right now.'}
            </Text>
          </View>
          <Text
            style={[
              styles.alertValue,
              {
                color:
                  kpis.overdueFollowUps > 0 ? colors.danger : colors.success,
              },
            ]}
          >
            {kpis.overdueFollowUps}
          </Text>
        </View>
      </Pressable>

      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightTitle}>Pipeline mix</Text>
          <Text style={styles.insightCaption}>This week</Text>
        </View>
        <View style={styles.mixChart}>
          {(
            [
              {
                key: 'due',
                label: 'Due',
                value: kpis.todayFollowUps,
                color: colors.brand,
              },
              {
                key: 'late',
                label: 'Late',
                value: kpis.overdueFollowUps,
                color: colors.danger,
              },
              {
                key: 'new',
                label: 'New',
                value: kpis.newLeads,
                color: colors.success,
              },
              {
                key: 'done',
                label: 'Done',
                value: kpis.completedActivities,
                color: isDark ? '#60A5FA' : '#2563EB',
              },
            ] as const
          ).map((bar) => (
            <View key={bar.key} style={styles.mixCol}>
              <Text style={styles.mixBarValue}>{bar.value}</Text>
              <View style={styles.mixBarTrack}>
                <View
                  style={[
                    styles.mixBarFill,
                    {
                      height: `${Math.max(8, (bar.value / mixMax) * 100)}%`,
                      backgroundColor: bar.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.mixBarLabel}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() => go('/(tabs)/leads')}
        style={({ pressed }) => [styles.insightCard, pressed && styles.pressed]}
      >
        <View style={styles.insightHeader}>
          <Text style={styles.insightTitle}>Pipeline overview</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
        <View style={styles.overviewRow}>
          <ProgressRing
            progress={pct(kpis.completedActivities, Math.max(completionTotal, 1))}
            size={88}
            stroke={colors.brand}
            track={colors.surfaceMuted}
          >
            <Text style={styles.overviewRingValue}>{kpis.totalAssigned}</Text>
          </ProgressRing>
          <View style={styles.overviewCopy}>
            <Text style={styles.overviewMetric}>
              {kpis.totalAssigned}{' '}
              <Text style={styles.overviewMetricMuted}>assigned leads</Text>
            </Text>
            <Text style={styles.overviewSub}>
              {kpis.newLeads} new · {kpis.completedActivities} activities done
            </Text>
            <Text style={styles.overviewLink}>Browse leads →</Text>
          </View>
        </View>
      </Pressable>

      {/* Upcoming queue */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Upcoming follow-ups</Text>
        <Pressable onPress={() => go('/(tabs)/follow-ups')} hitSlop={6}>
          <Text style={styles.sectionLink}>Open queue</Text>
        </Pressable>
      </View>

      <View style={styles.upcomingCard}>
        {queue.length === 0 ? (
          <Text style={styles.upcomingEmpty}>
            No follow-ups lined up. Schedule the next touch from a lead.
          </Text>
        ) : (
          queue.map((item, index) => {
            const overdue = new Date(item.dueAt).getTime() < Date.now();
            return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/leads/${item.leadId}`)}
                style={({ pressed }) => [
                  styles.upcomingRow,
                  index > 0 && styles.upcomingDivider,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.upcomingLeft}>
                  <Text style={styles.upcomingName} numberOfLines={1}>
                    {item.leadName}
                  </Text>
                  <Text style={styles.upcomingMeta} numberOfLines={1}>
                    {item.type?.replace(/_/g, ' ') || 'Follow-up'}
                    {item.leadPhone ? ` · ${item.leadPhone}` : ''}
                  </Text>
                </View>
                <View style={styles.upcomingRight}>
                  <Text
                    style={[
                      styles.upcomingTime,
                      overdue && { color: colors.danger },
                    ]}
                  >
                    {format(new Date(item.dueAt), 'h:mm a')}
                  </Text>
                  <Text
                    style={[
                      styles.upcomingDay,
                      overdue && { color: colors.danger },
                    ]}
                  >
                    {overdue ? 'Overdue' : format(new Date(item.dueAt), 'dd MMM')}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { gap: 14 },
    pressed: { opacity: 0.88 },

    greetingBlock: { gap: 4, paddingTop: 2 },
    greeting: {
      ...typography.title,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.4,
    },
    dateLine: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
    },

    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.brand,
      borderRadius: radii.pill,
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    ctaText: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },

    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    kpiCard: {
      width: '48.5%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 6,
      minHeight: 96,
    },
    kpiTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    kpiIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radii.pill,
      maxWidth: '62%',
    },
    kpiBadgeText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
    },
    kpiValue: {
      fontSize: 26,
      lineHeight: 30,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: colors.text,
      marginTop: 2,
    },
    kpiLabel: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },

    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      gap: 8,
    },
    sectionTitle: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    sectionLink: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      color: colors.brand,
    },

    liveCard: {
      backgroundColor: isDark ? colors.surface : colors.brand,
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    ringValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.white,
      lineHeight: 26,
    },
    ringHint: {
      ...typography.caption,
      fontSize: 11,
      color: 'rgba(255,255,255,0.8)',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    liveCopy: { flex: 1, gap: 4, minWidth: 0 },
    liveEyebrow: {
      ...typography.label,
      fontSize: 10,
      letterSpacing: 0.8,
      color: 'rgba(255,255,255,0.72)',
    },
    liveTitle: {
      ...typography.subtitle,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color: colors.white,
    },
    liveMeta: {
      ...typography.caption,
      fontSize: 12,
      color: 'rgba(255,255,255,0.78)',
      marginBottom: 4,
    },
    liveAvatars: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    liveAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    liveAvatarText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    liveAvatarLabel: {
      ...typography.caption,
      fontSize: 11,
      color: 'rgba(255,255,255,0.78)',
      marginLeft: 8,
    },

    insightCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    insightTitle: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    insightRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    insightStat: { flex: 1, gap: 2 },
    insightValue: {
      fontSize: 22,
      lineHeight: 26,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.4,
    },
    insightCaption: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 999 },

    alertRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    alertCopy: { flex: 1, gap: 3, minWidth: 0 },
    alertLabel: {
      ...typography.subtitle,
      fontSize: 14,
      color: colors.text,
    },
    alertHint: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    alertValue: {
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.8,
    },

    mixChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 120,
      gap: 8,
      paddingTop: 4,
    },
    mixCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      gap: 6,
    },
    mixBarValue: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    mixBarTrack: {
      flex: 1,
      width: '70%',
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    mixBarFill: {
      width: '100%',
      borderRadius: 8,
      minHeight: 8,
    },
    mixBarLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },

    overviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    overviewRingValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    overviewCopy: { flex: 1, gap: 4, minWidth: 0 },
    overviewMetric: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.text,
    },
    overviewMetricMuted: {
      color: colors.textMuted,
      fontWeight: '500',
    },
    overviewSub: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    overviewLink: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      color: colors.brand,
      marginTop: 4,
    },

    upcomingCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    upcomingEmpty: {
      ...typography.caption,
      color: colors.textMuted,
      paddingVertical: 16,
      paddingHorizontal: 4,
      lineHeight: 18,
    },
    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    upcomingDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    upcomingLeft: { flex: 1, gap: 2, minWidth: 0 },
    upcomingName: {
      ...typography.subtitle,
      fontSize: 14,
      color: colors.text,
    },
    upcomingMeta: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
    },
    upcomingRight: { alignItems: 'flex-end', gap: 2 },
    upcomingTime: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    upcomingDay: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
  });
}
