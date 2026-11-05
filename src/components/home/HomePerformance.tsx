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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { homePalette, type HomePalette } from '@/components/home/homePalette';
import {
  BarsPurpleIcon,
  HandsetRedIcon,
  PeopleBlueIcon,
} from '@/components/home/QuickActionIcons';
import {
  ArrowRightLongIcon,
  TrendUpIcon,
} from '@/components/icons/hugeicons';
import { useTheme } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  trends?: MobileDashboard['trends'];
  completedByDay?: MobileDashboard['completedByDay'];
};

type SideCard = {
  key: string;
  title: string;
  value: number;
  valueColor: string;
  hint: string;
  icon: ReactNode;
  arrow: string;
  background: string;
  border: string;
  circle: string;
  href: Href;
};

const RING_STROKE = 11;
const SPARK_WIDTH = 72;
const SPARK_HEIGHT = 36;
const TREND_UP = '#16A34A';
const TREND_DOWN = '#DC2626';
/** Below this, the ring gives way so the card's copy stays on one line. */
const COMPACT_WIDTH = 385;

function CompletionRing({
  percent,
  size,
  palette,
}: {
  percent: number;
  size: number;
  palette: HomePalette;
}) {
  const r = (size - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  return (
    <View style={[ringStyles.root, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={palette.tones.purple.bg}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={palette.accent}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - percent / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={[ringStyles.value, { color: palette.ink }]}>{percent}%</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  value: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700',
  },
});

/** Curves through the midpoints, so a jagged week still reads as one line. */
function sparkPath(points: { x: number; y: number }[]) {
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const point = points[i];
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    d += ` Q${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x} ${last.y}`;
}

function Sparkline({ series }: { series: number[] }) {
  const peak = Math.max(...series, 1);
  const points = series.map((value, index) => ({
    x: (index / (series.length - 1)) * SPARK_WIDTH,
    y: SPARK_HEIGHT - 3 - (value / peak) * (SPARK_HEIGHT - 6),
  }));
  const line = sparkPath(points);
  return (
    <Svg width={SPARK_WIDTH} height={SPARK_HEIGHT}>
      <Defs>
        <LinearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#35C795" stopOpacity={0.4} />
          <Stop offset="1" stopColor="#35C795" stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      <Path
        d={`${line} V${SPARK_HEIGHT} H0 Z`}
        fill="url(#spark-fill)"
      />
      <Path d={line} fill="none" stroke="#35C795" strokeWidth={1.6} />
    </Svg>
  );
}

export function HomePerformance({ kpis, trends, completedByDay }: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = homePalette(isDark);
  const compact = useWindowDimensions().width < COMPACT_WIDTH;
  const styles = useMemo(
    () => createStyles(palette, compact),
    [palette, compact],
  );
  const router = useRouter();

  const done = kpis.completedActivities;
  const open = kpis.pendingFollowUps;
  const total = done + open;
  const completion = total <= 0 ? 100 : Math.round((done / total) * 100);
  const overdue = kpis.overdueFollowUps;

  const trend = trends?.completed;
  const hasTrend = typeof trend === 'number';
  const trendColor =
    !hasTrend || trend === 0
      ? palette.inkSoft
      : trend < 0
        ? TREND_DOWN
        : TREND_UP;
  const showSpark =
    !!completedByDay &&
    completedByDay.length > 1 &&
    completedByDay.some((count) => count > 0);

  const cards: SideCard[] = [
    {
      key: 'overdue',
      title: 'Overdue Calls',
      value: overdue,
      valueColor: isDark ? palette.tones.red.fg : '#A8171A',
      hint: overdue > 0 ? 'Act now' : 'Caught up',
      icon: <HandsetRedIcon size={21} />,
      arrow: palette.inkSoft,
      background: isDark ? palette.tones.red.bg : '#FDECEC',
      border: isDark ? palette.tones.red.bg : '#FBDADA',
      circle: isDark ? '#F23B3B33' : '#FBD6D6',
      href: '/(tabs)/follow-ups',
    },
    {
      key: 'pipeline',
      title: 'Pipeline Overview',
      value: kpis.totalAssigned,
      valueColor: palette.ink,
      hint: 'Assigned leads',
      icon: <PeopleBlueIcon size={23} />,
      arrow: palette.link,
      background: isDark ? palette.tones.blue.bg : '#E9F0FE',
      border: isDark ? palette.tones.blue.bg : '#D8E5FC',
      circle: isDark ? '#005BED33' : '#D5E3FC',
      href: '/(tabs)/leads',
    },
  ];

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Follow-up completion ${completion}%`}
        onPress={() => router.navigate('/activities')}
        style={({ pressed }) => [styles.panelCard, pressed && styles.pressed]}
      >
        <View style={styles.head}>
          <View style={styles.headMark}>
            <BarsPurpleIcon size={15} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            Your Performance
          </Text>
          <View style={styles.details}>
            <Text style={styles.detailsText}>View Details</Text>
            <HugeiconsIcon
              icon={ArrowRightLongIcon}
              size={15}
              color={palette.accent}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <CompletionRing
            percent={completion}
            size={compact ? 72 : 84}
            palette={palette}
          />
          <View style={styles.copy}>
            <Text
              style={styles.copyTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Follow-up Completion
            </Text>
            <Text style={styles.copyLine} numberOfLines={1}>
              {done} activities done
            </Text>
            <Text style={styles.copyLine} numberOfLines={1}>
              {open} still open
            </Text>
          </View>
          {hasTrend ? (
            <>
              <View style={styles.rule} />
              <View style={styles.trend}>
                <View style={styles.trendRow}>
                  {trend === 0 ? null : (
                    <View style={trend < 0 ? styles.falling : undefined}>
                      <HugeiconsIcon
                        icon={TrendUpIcon}
                        size={15}
                        color={trendColor}
                      />
                    </View>
                  )}
                  <Text style={[styles.trendValue, { color: trendColor }]}>
                    {trend > 0 ? '+' : ''}
                    {trend}%
                  </Text>
                </View>
                <Text style={styles.trendHint}>vs last week</Text>
                {showSpark ? <Sparkline series={completedByDay} /> : null}
              </View>
            </>
          ) : null}
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
              { backgroundColor: card.background, borderColor: card.border },
              pressed && styles.pressed,
            ]}
          >
            <View
              collapsable={false}
              style={[styles.circle, { backgroundColor: card.circle }]}
            >
              {card.icon}
            </View>
            <View style={styles.cardCopy}>
              <Text
                style={styles.cardTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {card.title}
              </Text>
              <Text
                style={[styles.cardValue, { color: card.valueColor }]}
                numberOfLines={1}
              >
                {card.value}
              </Text>
              <View style={styles.cardFoot}>
                <Text style={styles.cardHint} numberOfLines={1}>
                  {card.hint}
                </Text>
                <HugeiconsIcon
                  icon={ArrowRightLongIcon}
                  size={15}
                  color={card.arrow}
                />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(palette: HomePalette, compact: boolean) {
  return StyleSheet.create({
    root: { gap: 16 },
    pressed: { opacity: 0.9 },
    panelCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
      overflow: 'hidden',
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 11,
      paddingTop: 9,
      paddingBottom: 7,
    },
    headMark: {
      width: 22,
      height: 22,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.tones.purple.bg,
    },
    title: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: palette.ink,
    },
    details: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailsText: {
      fontSize: 11.5,
      lineHeight: 15,
      fontWeight: '600',
      color: palette.accent,
    },
    panel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 8 : 10,
      paddingLeft: compact ? 8 : 12,
      paddingRight: compact ? 8 : 10,
      paddingVertical: 8,
      borderTopLeftRadius: 16,
      backgroundColor: palette.track,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    copyTitle: {
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '700',
      color: palette.ink,
    },
    copyLine: {
      fontSize: 12,
      lineHeight: 16,
      color: palette.inkSoft,
    },
    rule: {
      alignSelf: 'stretch',
      width: StyleSheet.hairlineWidth,
      marginVertical: 6,
      backgroundColor: palette.rule,
    },
    trend: {
      alignItems: 'center',
      width: SPARK_WIDTH,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    falling: { transform: [{ scaleY: -1 }] },
    trendValue: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
    },
    trendHint: {
      fontSize: 11,
      lineHeight: 14,
      color: palette.inkSoft,
    },
    row: { flexDirection: 'row', gap: 12 },
    card: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      gap: compact ? 6 : 8,
      padding: compact ? 8 : 9,
      borderRadius: 14,
      borderWidth: 1,
    },
    circle: {
      width: compact ? 34 : 38,
      height: compact ? 34 : 38,
      borderRadius: compact ? 17 : 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCopy: { flex: 1, minWidth: 0 },
    cardTitle: {
      fontSize: compact ? 11.5 : 12,
      lineHeight: 17,
      fontWeight: '600',
      color: palette.ink,
    },
    cardValue: {
      fontSize: 23,
      lineHeight: 29,
      fontWeight: '700',
    },
    cardFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
    },
    cardHint: {
      flexShrink: 1,
      fontSize: 11.5,
      lineHeight: 15,
      color: palette.inkSoft,
    },
  });
}
