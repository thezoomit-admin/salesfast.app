import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { format } from 'date-fns/format';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  ClockAlertIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
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
  showCallSyncSetup?: boolean;
  onSetupCallSync?: () => void;
};

type KpiSlide = {
  key: string;
  label: string;
  value: number;
  secondary: string;
  href: Href;
  icon: IoniconName;
  accent: string;
  soft: string;
  live?: boolean;
  trend?: string;
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

export function HomeDashboard({
  kpis,
  recentLeads: _recentLeads,
  queue,
  firstName,
  showCallSyncSetup = false,
  onSetupCallSync,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const liveCardWidth = Math.min(300, windowWidth - 56);
  // ~1.8 cards visible — wider tiles so the next card peeks, not a full second.
  const kpiCardWidth = Math.round((windowWidth - 32) / 1.8);

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

  const kpiSlides: KpiSlide[] = [
    {
      key: 'due',
      label: 'Due today',
      value: kpis.todayFollowUps,
      secondary: kpis.todayFollowUps > 0 ? 'Live now' : 'Clear',
      live: kpis.todayFollowUps > 0,
      href: '/(tabs)/follow-ups',
      icon: 'document-text-outline',
      accent: colors.success,
      soft: colors.successSoft,
    },
    {
      key: 'assigned',
      label: 'Assigned leads',
      value: kpis.totalAssigned,
      secondary: 'Leads',
      trend: kpis.newLeads > 0 ? `+${kpis.newLeads}` : undefined,
      href: '/(tabs)/leads',
      icon: 'people-outline',
      accent: colors.warning,
      soft: colors.warningSoft,
    },
    {
      key: 'new',
      label: 'New this week',
      value: kpis.newLeads,
      secondary: 'New leads',
      live: kpis.newLeads > 0,
      href: '/(tabs)/leads',
      icon: 'flash-outline',
      accent: colors.brand,
      soft: isDark ? colors.brandSoft : colors.primary50,
    },
    {
      key: 'done',
      label: 'Activities done',
      value: kpis.completedActivities,
      secondary: 'Completed',
      href: '/activities',
      icon: 'checkmark-done-outline',
      accent: isDark ? '#60A5FA' : '#2563EB',
      soft: isDark ? '#0B1F3A' : '#EFF6FF',
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
      {/* Welcome card — soft white panel on wash bg */}
      <View style={styles.welcomeCard}>
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.dateLine}>{todayLabel}</Text>
        </View>

        {showCallSyncSetup ? (
          <Pressable
            onPress={onSetupCallSync}
            hitSlop={6}
            style={({ pressed }) => [
              styles.syncWarn,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Set up call sync"
          >
            <Ionicons
              name="cloud-offline-outline"
              size={14}
              color={colors.warning}
            />
            <Text style={styles.syncWarnText}>Set up call sync</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.warning}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => go('/(tabs)/follow-ups')}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open follow-ups"
        >
          <Ionicons name="people-outline" size={16} color={colors.white} />
          <Text style={styles.ctaText}>Open follow-ups</Text>
        </Pressable>
      </View>

      {/* KPI slider — reference style, flat white cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiRow}
        decelerationRate="fast"
        snapToInterval={kpiCardWidth + 12}
      >
        {kpiSlides.map((card) => (
          <Pressable
            key={card.key}
            onPress={() => go(card.href)}
            style={({ pressed }) => [
              styles.kpiCard,
              { width: kpiCardWidth },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${card.label}: ${card.value}`}
          >
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel} numberOfLines={1}>
                {card.label}
              </Text>
              <View style={[styles.kpiIcon, { backgroundColor: card.soft }]}>
                <Ionicons name={card.icon} size={16} color={card.accent} />
              </View>
            </View>

            <View style={styles.kpiBottom}>
              <Text style={styles.kpiValue}>{card.value}</Text>
              {card.live ? (
                <View style={styles.kpiLive}>
                  <View
                    style={[styles.kpiLiveDot, { backgroundColor: card.accent }]}
                  />
                  <Text style={styles.kpiSecondary}>{card.secondary}</Text>
                </View>
              ) : (
                <Text style={styles.kpiSecondary}>{card.secondary}</Text>
              )}
              {card.trend ? (
                <Text style={[styles.kpiTrend, { color: colors.success }]}>
                  {card.trend}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Live monitoring — 2 horizontal cards, no border/shadow */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Live queue monitoring</Text>
        <Pressable onPress={() => go('/(tabs)/follow-ups')} hitSlop={6}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.liveRow}
        decelerationRate="fast"
        snapToInterval={liveCardWidth + 12}
      >
        {(
          [
            {
              key: 'due',
              title: 'Due today follow-ups',
              status: kpis.todayFollowUps > 0 ? 'Live now' : 'All clear',
              statusLive: kpis.todayFollowUps > 0,
              line1: `${kpis.todayFollowUps} due today`,
              line2: `${kpis.pendingFollowUps} pending in queue`,
              ringValue: String(kpis.todayFollowUps),
              ringLabel: 'due',
              progress: clearRate,
              href: '/(tabs)/follow-ups' as Href,
              bg: colors.brand,
              icon: Calendar03Icon,
              // Soft peach on brand orange — matches card wash.
              ringStroke: '#FFD4C4',
              ringTrack: 'rgba(255,255,255,0.22)',
              statusColor: '#FFD4C4',
            },
            {
              key: 'overdue',
              title: 'Overdue follow-ups',
              status:
                kpis.overdueFollowUps > 0 ? 'Needs attention' : 'Caught up',
              statusLive: kpis.overdueFollowUps > 0,
              line1: `${kpis.overdueFollowUps} overdue`,
              line2: `${focusTotal} active in focus`,
              ringValue: String(kpis.overdueFollowUps),
              ringLabel: 'late',
              progress:
                focusTotal <= 0
                  ? 100
                  : Math.round(
                      ((focusTotal - kpis.overdueFollowUps) /
                        Math.max(focusTotal, 1)) *
                        100
                    ),
              href: '/(tabs)/follow-ups' as Href,
              bg: isDark ? '#1B2A2A' : '#1A4D4E',
              icon: ClockAlertIcon,
              // Mint on teal — matches card wash.
              ringStroke: '#9BE7C4',
              ringTrack: 'rgba(255,255,255,0.22)',
              statusColor: '#9BE7C4',
            },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.key}
            onPress={() => go(item.href)}
            style={({ pressed }) => [
              styles.liveCard,
              { width: liveCardWidth, backgroundColor: item.bg },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            <View style={styles.liveTop}>
              <View style={styles.liveIconDark}>
                <HugeiconsIcon
                  icon={item.icon}
                  size={15}
                  color={colors.white}
                  strokeWidth={1.8}
                />
              </View>
              <View style={styles.liveArrowBtn}>
                <View style={styles.liveArrowIcon}>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    color={colors.text}
                    strokeWidth={1.8}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.liveTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.liveStatusRow}>
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: item.statusLive
                      ? item.statusColor
                      : 'rgba(255,255,255,0.45)',
                  },
                ]}
              />
              <Text style={styles.liveStatusText}>{item.status}</Text>
            </View>

            <View style={styles.liveBottom}>
              <View style={styles.liveMetaCol}>
                <View style={styles.liveMetaRow}>
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={13}
                    color="rgba(255,255,255,0.75)"
                    strokeWidth={1.8}
                  />
                  <Text style={styles.liveMetaText}>{item.line1}</Text>
                </View>
                <View style={styles.liveMetaRow}>
                  <HugeiconsIcon
                    icon={UserIcon}
                    size={13}
                    color="rgba(255,255,255,0.75)"
                    strokeWidth={1.8}
                  />
                  <Text style={styles.liveMetaText}>{item.line2}</Text>
                </View>
              </View>

              <ProgressRing
                progress={item.progress}
                size={72}
                stroke={item.ringStroke}
                track={item.ringTrack}
              >
                <Text style={styles.ringValue}>{item.ringValue}</Text>
                <Text style={styles.ringHint}>{item.ringLabel}</Text>
              </ProgressRing>
            </View>
          </Pressable>
        ))}
      </ScrollView>

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

function createStyles(colors: ThemeColors, _isDark: boolean) {
  const card = {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 0,
    // No shadow / elevation on any home card.
  } as const;

  return StyleSheet.create({
    root: { gap: 14 },
    pressed: { opacity: 0.88 },

    welcomeCard: {
      ...card,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 14,
    },
    greetingBlock: { gap: 4 },
    greeting: {
      ...typography.title,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.4,
    },
    dateLine: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
    },
    syncWarn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: colors.warningSoft,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.pill,
    },
    syncWarnText: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      color: colors.warning,
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

    kpiRow: {
      gap: 12,
      paddingRight: 4,
    },
    kpiCard: {
      ...card,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      minHeight: 108,
      justifyContent: 'space-between',
      gap: 18,
    },
    kpiTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    kpiLabel: {
      ...typography.caption,
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
      fontWeight: '500',
      minWidth: 0,
    },
    kpiIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    kpiBottom: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 6,
    },
    kpiValue: {
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '700',
      letterSpacing: -0.6,
      color: colors.text,
    },
    kpiLive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    kpiLiveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    kpiSecondary: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.text,
    },
    kpiTrend: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      marginLeft: 2,
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

    liveRow: {
      gap: 12,
      paddingRight: 4,
    },
    liveCard: {
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 8,
      borderWidth: 0,
      overflow: 'hidden',
      minHeight: 168,
    },
    liveTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    liveIconDark: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(0,0,0,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveArrowBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    liveArrowIcon: {
      transform: [{ rotate: '-45deg' }],
    },
    liveTitle: {
      ...typography.subtitle,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: colors.white,
      marginTop: 2,
    },
    liveStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    liveStatusText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
    liveBottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4,
    },
    liveMetaCol: { flex: 1, gap: 6, minWidth: 0, paddingBottom: 4 },
    liveMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveMetaText: {
      ...typography.caption,
      flex: 1,
      fontSize: 12,
      color: 'rgba(255,255,255,0.78)',
      minWidth: 0,
    },
    ringValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.white,
      lineHeight: 18,
    },
    ringHint: {
      ...typography.caption,
      fontSize: 10,
      color: 'rgba(255,255,255,0.8)',
      textTransform: 'lowercase',
    },

    insightCard: {
      ...card,
      borderRadius: 18,
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
      ...card,
      borderRadius: 18,
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
