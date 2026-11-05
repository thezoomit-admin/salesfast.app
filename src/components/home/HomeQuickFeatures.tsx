import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  HandsetBlueIcon,
  QuickActionIcons,
} from '@/components/home/QuickActionIcons';
import {
  ArrowRightLongIcon,
  ArrowUpIcon,
  FlashSolidIcon,
  HomeSolidIcon,
} from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  trends?: MobileDashboard['trends'];
};

type Tint = { circle: string; waveBack: string; waveFront: string };

type StatCard = {
  key: string;
  label: string;
  /** Null when the server is too old to send it. */
  value: number | null;
  trend: number | null;
  icon: ReactNode;
  tint: Tint;
  darkTint: Tint;
  href: Href;
};

const ICON_SIZE = 18;
/** Below this, the card labels need a tighter header to fit on one line. */
const COMPACT_WIDTH = 385;
const WAVE_HEIGHT = 20;
const TREND_UP = '#16A34A';
const TREND_DOWN = '#DC2626';

const FollowUpsIcon = QuickActionIcons['follow-ups'];

function trendText(trend: number) {
  return `${trend > 0 ? '+' : ''}${trend}%`;
}

export function HomeQuickFeatures({ kpis, trends }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  const styles = useMemo(
    () => createStyles(colors, isDark, compact),
    [colors, isDark, compact],
  );
  const router = useRouter();

  const cards: StatCard[] = [
    {
      key: 'leads',
      label: 'Total Leads',
      value: kpis.totalAssigned,
      trend: trends?.leads ?? null,
      icon: <HugeiconsIcon icon={HomeSolidIcon} size={ICON_SIZE} color="#5A4FF0" />,
      tint: { circle: '#ECE9FE', waveBack: '#E6E1FD', waveFront: '#C9C1F9' },
      darkTint: { circle: '#6B63F733', waveBack: '#6B63F726', waveFront: '#6B63F74D' },
      href: '/(tabs)/leads',
    },
    {
      key: 'follow-ups',
      label: 'Follow-ups',
      value: kpis.pendingFollowUps,
      trend: trends?.followUps ?? null,
      icon: <FollowUpsIcon size={ICON_SIZE} />,
      tint: { circle: '#E0F6EE', waveBack: '#DDF5EB', waveFront: '#B7ECD6' },
      darkTint: { circle: '#0AAB7533', waveBack: '#0AAB7526', waveFront: '#0AAB754D' },
      href: '/(tabs)/follow-ups',
    },
    {
      key: 'calls',
      label: 'Calls Today',
      value: kpis.callsToday ?? null,
      trend: trends?.calls ?? null,
      icon: <HandsetBlueIcon size={ICON_SIZE} />,
      tint: { circle: '#DFE9FD', waveBack: '#DEE9FD', waveFront: '#AFCDFB' },
      darkTint: { circle: '#1E7BFF33', waveBack: '#1E7BFF26', waveFront: '#1E7BFF4D' },
      href: '/(tabs)/calls',
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <HugeiconsIcon icon={FlashSolidIcon} size={20} color="#FFA51F" />
        <Text style={styles.title} numberOfLines={1}>
          Quick access
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View all leads"
          onPress={() => router.navigate('/(tabs)/leads')}
          hitSlop={8}
          style={({ pressed }) => [styles.viewAll, pressed && styles.pressed]}
        >
          <Text style={styles.viewAllText}>View all</Text>
          <HugeiconsIcon icon={ArrowRightLongIcon} size={16} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.row}>
        {cards.map((card) => {
          const tint = isDark ? card.darkTint : card.tint;
          const { trend } = card;
          const value = card.value ?? '—';
          return (
            <Pressable
              key={card.key}
              accessibilityRole="button"
              accessibilityLabel={
                trend === null
                  ? `${card.label}: ${value}`
                  : `${card.label}: ${value}, ${trendText(trend)}`
              }
              onPress={() => router.navigate(card.href)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              {/* Clips the waves to the card's rounded corners. */}
              <View
                collapsable={false}
                style={[styles.cardClip, { borderColor: tint.waveBack }]}
              >
                {/* On Android a percent width on an absolute child leaves out
                    the parent's padding, so the width comes from this box. */}
                <View style={styles.wave}>
                  <Svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 24"
                    preserveAspectRatio="none"
                  >
                    <Path
                      d="M0 3C14 6 26 12 42 16C58 20 68 15 77 9C85 4 92 1 100 0V24H0Z"
                      fill={tint.waveBack}
                    />
                    <Path
                      d="M12 24C24 18 36 17 50 18C70 19 86 18 100 15V24Z"
                      fill={tint.waveFront}
                    />
                  </Svg>
                </View>

                <View style={styles.cardHead}>
                  <View
                    collapsable={false}
                    style={[styles.circle, { backgroundColor: tint.circle }]}
                  >
                    {card.icon}
                  </View>
                  <Text
                    style={styles.label}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {card.label}
                  </Text>
                </View>

                <Text style={styles.value} numberOfLines={1}>
                  {value}
                </Text>

                <View style={styles.trend}>
                  {trend === null ? null : (
                    <Trend
                      trend={trend}
                      flatColor={colors.textSecondary}
                      styles={styles}
                    />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Trend({
  trend,
  flatColor,
  styles,
}: {
  trend: number;
  flatColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const color =
    trend === 0 ? flatColor : trend < 0 ? TREND_DOWN : TREND_UP;
  return (
    <>
      {trend === 0 ? null : (
        <View style={trend < 0 ? styles.arrowDown : undefined}>
          <HugeiconsIcon icon={ArrowUpIcon} size={11} color={color} />
        </View>
      )}
      <Text style={[styles.trendText, { color }]} numberOfLines={1}>
        {trendText(trend)}
      </Text>
    </>
  );
}

function createStyles(
  colors: ThemeColors,
  isDark: boolean,
  compact: boolean,
) {
  const circle = compact ? 26 : 29;
  return StyleSheet.create({
    root: { gap: 12 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700',
      color: isDark ? colors.text : '#15202C',
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    viewAllText: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.brand,
    },
    row: { flexDirection: 'row', gap: 8 },
    pressed: { opacity: 0.8 },
    card: {
      flex: 1,
      minWidth: 0,
      borderRadius: 14,
      backgroundColor: isDark ? colors.surfaceMuted : colors.surface,
    },
    cardClip: {
      minHeight: 92,
      paddingHorizontal: compact ? 7 : 9,
      paddingTop: 9,
      paddingBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      overflow: 'hidden',
    },
    wave: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: WAVE_HEIGHT,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 4 : 6,
    },
    circle: {
      width: circle,
      height: circle,
      borderRadius: circle / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.caption,
      flex: 1,
      minWidth: 0,
      fontSize: compact ? 10.5 : 11,
      lineHeight: 15,
      fontWeight: '500',
      color: isDark ? colors.textSecondary : '#5B6478',
    },
    value: {
      marginTop: 4,
      paddingLeft: 7,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: '800',
      color: isDark ? colors.text : '#15202C',
    },
    trend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      height: 15,
      paddingLeft: 7,
    },
    arrowDown: { transform: [{ rotate: '180deg' }] },
    trendText: {
      fontSize: 10.5,
      lineHeight: 14,
      fontWeight: '600',
    },
  });
}
