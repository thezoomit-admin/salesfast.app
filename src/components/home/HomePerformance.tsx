import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { homeTints, HomeSection } from '@/components/home/HomeSection';
import {
  ClockAlertIcon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { FollowUpStats, MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  /** Missing on old servers — the on-time rate is then hidden. */
  followUpStats?: FollowUpStats;
};

type SideCard = {
  key: string;
  title: string;
  value: number;
  valueColor: string;
  hint: string;
  icon: ComponentProps<typeof HugeiconsIcon>['icon'];
  iconColor: string;
  background: string;
  href: Href;
};

const RING = 96;
const RING_STROKE = 9;
const BANNER_BG = '#0F3B3C';
const BANNER_BAND = 'rgba(0,0,0,0.28)';
const RING_COLOR = '#9BE7C4';

function CompletionRing({ percent }: { percent: number }) {
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const center = RING / 2;
  return (
    <View style={ringStyles.root}>
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={RING_COLOR}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - percent / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={ringStyles.value}>{percent}%</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  root: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export function HomePerformance({ kpis, followUpStats }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const tints = homeTints(colors, isDark);

  const done = kpis.completedActivities;
  const open = kpis.pendingFollowUps;
  const total = done + open;
  const completion = total <= 0 ? 100 : Math.round((done / total) * 100);
  const overdue = kpis.overdueFollowUps;
  const onTime = followUpStats?.onTimePercent;

  const cards: SideCard[] = [
    {
      key: 'overdue',
      title: 'Overdue pressure',
      value: overdue,
      valueColor: overdue > 0 ? colors.danger : colors.success,
      hint: overdue > 0 ? 'Act now' : 'Caught up',
      icon: ClockAlertIcon,
      iconColor: isDark ? '#A78BFA' : '#7C3AED',
      background: tints.lilac,
      href: '/(tabs)/follow-ups',
    },
    {
      key: 'pipeline',
      title: 'Pipeline overview',
      value: kpis.totalAssigned,
      valueColor: colors.text,
      hint: 'Assigned leads',
      icon: PermanentJobIcon,
      iconColor: isDark ? '#2DD4BF' : '#0891B2',
      background: tints.aqua,
      href: '/(tabs)/leads',
    },
  ];

  return (
    <HomeSection title="Your performance">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Follow-up completion ${completion}%`}
        onPress={() => router.navigate('/activities')}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <View style={styles.bannerBody}>
          <CompletionRing percent={completion} />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>Follow-up completion</Text>
            <View style={styles.bannerCta}>
              <Text style={styles.bannerCtaText}>View activities</Text>
            </View>
          </View>
        </View>
        <View style={styles.bannerBand}>
          <Text style={styles.bandStrong}>{done} activities done</Text>
          <Text style={styles.bandText}>
            {open} still open
            {onTime == null ? '' : ` · ${onTime}% on time`}
          </Text>
        </View>
      </Pressable>

      <View style={styles.row}>
        {cards.map((card) => (
          <Pressable
            key={card.key}
            accessibilityRole="button"
            accessibilityLabel={`${card.title}: ${card.value}`}
            onPress={() => router.navigate(card.href)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: card.background },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cardTitle} numberOfLines={1}>
              {card.title}
            </Text>
            <View style={styles.cardBottom}>
              <View style={styles.cardCopy}>
                <Text
                  style={[styles.cardValue, { color: card.valueColor }]}
                  numberOfLines={1}
                >
                  {card.value}
                </Text>
                <Text style={styles.cardHint} numberOfLines={1}>
                  {card.hint}
                </Text>
              </View>
              <HugeiconsIcon
                icon={card.icon}
                size={46}
                color={card.iconColor}
                strokeWidth={1.3}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </HomeSection>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.9 },
    banner: {
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: BANNER_BG,
    },
    bannerBody: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 16,
    },
    bannerCopy: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      gap: 10,
    },
    bannerTitle: {
      ...typography.title,
      fontSize: 19,
      lineHeight: 25,
      color: colors.white,
    },
    bannerCta: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: colors.brand,
    },
    bannerCtaText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.white,
    },
    bannerBand: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 1,
      backgroundColor: BANNER_BAND,
    },
    bandStrong: {
      ...typography.caption,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.white,
    },
    bandText: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: 'rgba(255,255,255,0.8)',
    },
    row: { flexDirection: 'row', gap: 10 },
    card: {
      flex: 1,
      minWidth: 0,
      minHeight: 112,
      justifyContent: 'space-between',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 19,
      color: colors.text,
    },
    cardBottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 6,
    },
    cardCopy: { flexShrink: 1, minWidth: 0 },
    cardValue: {
      fontSize: 24,
      lineHeight: 29,
      fontWeight: '700',
    },
    cardHint: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
  });
}
