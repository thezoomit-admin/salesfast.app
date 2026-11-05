import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArrowRight01Icon } from '@/components/icons/hugeicons';
import { blue, radii, typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type Kpis = MobileDashboard['kpis'];
type RecentLead = MobileDashboard['recentLeads'][number];

type Props = {
  kpis: Kpis;
  recentLeads: RecentLead[];
};

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatCount(n: number) {
  return n.toLocaleString('en-US');
}

const AVATAR_COLORS = ['#0F766E', blue[500], blue[800], '#6366F1', '#0891B2'];

export function HomeReports({ kpis, recentLeads }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();

  const pending = kpis.pendingFollowUps;
  const done = kpis.completedActivities;
  const completionTotal = pending + done;
  const completionRate =
    completionTotal <= 0 ? 100 : Math.round((done / completionTotal) * 100);

  const focusTotal = kpis.todayFollowUps + kpis.overdueFollowUps;
  const dueShare = pct(kpis.todayFollowUps, focusTotal);
  const overdueShare = pct(kpis.overdueFollowUps, focusTotal);

  const chartValues = [
    { key: 'new', label: 'New', value: kpis.newLeads },
    { key: 'due', label: 'Due', value: kpis.todayFollowUps },
    { key: 'late', label: 'Late', value: kpis.overdueFollowUps },
    { key: 'done', label: 'Done', value: kpis.completedActivities },
  ];
  const chartMax = Math.max(...chartValues.map((v) => v.value), 1);
  const highlightKey =
    kpis.overdueFollowUps > 0
      ? 'late'
      : kpis.todayFollowUps > 0
        ? 'due'
        : 'done';

  const avatars = recentLeads.slice(0, 2);
  const extraAvatars = Math.max(0, recentLeads.length - 2);

  const completionHint =
    completionRate >= 90
      ? 'Almost all follow-ups are wrapped up.'
      : completionRate >= 60
        ? 'Solid progress — keep clearing the queue.'
        : pending > 0
          ? `${formatCount(pending)} follow-ups still open.`
          : 'No follow-up activity logged yet.';

  const pipelineHint =
    kpis.overdueFollowUps > 0
      ? (
          <>
            Overdue load is about{' '}
            <Text style={styles.hintEmph}>
              {formatCount(kpis.overdueFollowUps)}
            </Text>
          </>
        )
      : kpis.newLeads > 0
        ? (
            <>
              {formatCount(kpis.newLeads)} new leads in the last 7 days.
            </>
          )
        : 'Pipeline is quiet — reach out to warm leads.';

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Reports</Text>
      </View>

      <View style={styles.list}>
        {/* 1 — Completion rate */}
        <ReportCard
          styles={styles}
          title="Follow-up completion"
          href="/activities"
          chevronColor={colors.textMuted}
          onPress={(href) => router.navigate(href)}
        >
          <View style={styles.metricRow}>
            <View style={styles.metricLeft}>
              <Text style={styles.bigValue}>{completionRate}%</Text>
              {kpis.newLeads > 0 ? (
                <View style={styles.trendUp}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={12}
                    color={colors.success}
                  />
                  <Text style={styles.trendUpText}>
                    {formatCount(kpis.newLeads)} new
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.avatarStack}>
              {avatars.map((lead, i) => (
                <View
                  key={lead.id}
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      marginLeft: i === 0 ? 0 : -8,
                      zIndex: avatars.length - i,
                    },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {(lead.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
              {(extraAvatars > 0 || avatars.length === 0) && (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarMore,
                    { marginLeft: avatars.length === 0 ? 0 : -8 },
                  ]}
                >
                  <Text style={styles.avatarMoreText}>
                    {avatars.length === 0
                      ? '0'
                      : `+${Math.min(extraAvatars, 99)}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, completionRate))}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.cardHint}>{completionHint}</Text>
        </ReportCard>

        {/* 2 — Focus mix */}
        <ReportCard
          styles={styles}
          title="Today's focus mix"
          href="/(tabs)/follow-ups"
          chevronColor={colors.textMuted}
          onPress={(href) => router.navigate(href)}
        >
          <View style={styles.splitTrack}>
            {focusTotal === 0 ? (
              <View
                style={[
                  styles.splitSeg,
                  styles.splitEmpty,
                  { backgroundColor: colors.surfaceMuted },
                ]}
              />
            ) : (
              <>
                {kpis.todayFollowUps > 0 ? (
                  <View
                    style={[
                      styles.splitSeg,
                      {
                        flex: Math.max(dueShare, 0.01),
                        backgroundColor: colors.success,
                        borderTopLeftRadius: 6,
                        borderBottomLeftRadius: 6,
                        borderTopRightRadius:
                          kpis.overdueFollowUps <= 0 ? 6 : 0,
                        borderBottomRightRadius:
                          kpis.overdueFollowUps <= 0 ? 6 : 0,
                      },
                    ]}
                  />
                ) : null}
                {kpis.overdueFollowUps > 0 ? (
                  <View
                    style={[
                      styles.splitSeg,
                      {
                        flex: Math.max(overdueShare, 0.01),
                        backgroundColor: colors.warning,
                        borderTopRightRadius: 6,
                        borderBottomRightRadius: 6,
                        borderTopLeftRadius:
                          kpis.todayFollowUps <= 0 ? 6 : 0,
                        borderBottomLeftRadius:
                          kpis.todayFollowUps <= 0 ? 6 : 0,
                      },
                    ]}
                  />
                ) : null}
              </>
            )}
          </View>

          <View style={styles.mixRows}>
            <View style={styles.mixRow}>
              <View style={[styles.mixTick, { backgroundColor: colors.success }]} />
              <Text style={styles.mixPct}>
                {focusTotal === 0 ? '0' : dueShare}%
              </Text>
              {kpis.todayFollowUps > 0 ? (
                <View style={styles.trendUp}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={11}
                    color={colors.success}
                  />
                  <Text style={styles.trendUpText}>
                    {formatCount(kpis.todayFollowUps)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.mixFlat}>0</Text>
              )}
              <Text style={styles.mixLabel} numberOfLines={1}>
                Due today
              </Text>
            </View>
            <View style={styles.mixRow}>
              <View style={[styles.mixTick, { backgroundColor: colors.warning }]} />
              <Text style={styles.mixPct}>
                {focusTotal === 0 ? '0' : overdueShare}%
              </Text>
              {kpis.overdueFollowUps > 0 ? (
                <View style={styles.trendDown}>
                  <Ionicons
                    name="arrow-down-outline"
                    size={11}
                    color={colors.danger}
                  />
                  <Text style={styles.trendDownText}>
                    {formatCount(kpis.overdueFollowUps)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.mixFlat}>0</Text>
              )}
              <Text style={styles.mixLabel} numberOfLines={1}>
                Overdue
              </Text>
            </View>
          </View>
        </ReportCard>

        {/* 3 — Pipeline pulse */}
        <ReportCard
          styles={styles}
          title="Pipeline pulse"
          href="/(tabs)/leads"
          chevronColor={colors.textMuted}
          onPress={(href) => router.navigate(href)}
        >
          <View style={styles.pulseRow}>
            <View style={styles.pulseCopy}>
              <Text style={styles.bigValue}>
                {formatCount(kpis.totalAssigned)}
              </Text>
              <Text style={styles.cardHint}>{pipelineHint}</Text>
            </View>
            <View style={styles.miniChart}>
              {chartValues.map((bar) => {
                const h = Math.max(10, Math.round((bar.value / chartMax) * 48));
                const active = bar.key === highlightKey;
                return (
                  <View key={bar.key} style={styles.miniCol}>
                    <View
                      style={[
                        styles.miniBar,
                        {
                          height: h,
                          backgroundColor: active
                            ? colors.brand
                            : colors.surfaceMuted,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.miniLabel,
                        active && styles.miniLabelActive,
                      ]}
                    >
                      {bar.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ReportCard>
      </View>
    </View>
  );
}

function ReportCard({
  styles,
  title,
  href,
  chevronColor,
  onPress,
  children,
}: {
  styles: ReturnType<typeof createStyles>;
  title: string;
  href: Href;
  chevronColor: string;
  onPress: (href: Href) => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => onPress(href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={16}
          color={chevronColor}
          strokeWidth={2}
        />
      </View>
      {children}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, _isDark: boolean) {
  return StyleSheet.create({
    root: { gap: 10 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    sectionTitle: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    list: { gap: 10 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 14,
      gap: 12,
    },
    pressed: { opacity: 0.88 },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardTitle: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    metricLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    bigValue: {
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.8,
      color: colors.text,
    },
    trendUp: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    trendUpText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.success,
    },
    trendDown: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    trendDownText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.danger,
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
    },
    avatarText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    avatarMore: {
      backgroundColor: colors.surfaceMuted,
    },
    avatarMoreText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    cardHint: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
    hintEmph: {
      color: colors.brand,
      fontWeight: '700',
    },
    splitTrack: {
      flexDirection: 'row',
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
      gap: 3,
      backgroundColor: 'transparent',
    },
    splitSeg: {
      height: '100%',
    },
    splitEmpty: {
      flex: 1,
      borderRadius: 6,
    },
    mixRows: { gap: 10 },
    mixRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    mixTick: {
      width: 4,
      height: 18,
      borderRadius: 2,
    },
    mixPct: {
      ...typography.subtitle,
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
      minWidth: 52,
    },
    mixFlat: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      minWidth: 28,
    },
    mixLabel: {
      ...typography.caption,
      flex: 1,
      textAlign: 'right',
      color: colors.textMuted,
      fontSize: 12,
    },
    pulseRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    pulseCopy: {
      flex: 1,
      gap: 8,
      minWidth: 0,
      paddingBottom: 2,
    },
    miniChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 72,
      paddingBottom: 0,
    },
    miniCol: {
      width: 22,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      height: '100%',
    },
    miniBar: {
      width: 14,
      borderRadius: 5,
      marginTop: 'auto',
    },
    miniLabel: {
      ...typography.caption,
      fontSize: 9,
      fontWeight: '600',
      color: colors.textMuted,
    },
    miniLabelActive: {
      color: colors.brand,
    },
  });
}
