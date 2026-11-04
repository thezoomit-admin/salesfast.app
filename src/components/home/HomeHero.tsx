import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Search02Icon } from '@/components/icons/hugeicons';
import { SettingsIconButton } from '@/components/ui/SettingsIconButton';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { requestTabIntent } from '@/lib/tabIntent';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

const FAVICON = require('../../../assets/images/favicon.png');

/** How far the sheet below rides up over the scene. */
const SHEET_OVERLAP = 24;
const SCENE_WIDTH = 400;
const SCENE_HEIGHT = 170;
/** How long the tapped summary stays before the pill folds back. */
const SUMMARY_MS = 4000;

/** Short enough to sit in the strip between the header row and the sheet. */
const BUILDINGS = [
  { x: 268, y: 116, w: 15, h: 26 },
  { x: 286, y: 108, w: 19, h: 34 },
  { x: 308, y: 118, w: 14, h: 24 },
  { x: 325, y: 112, w: 17, h: 30 },
];

const CLOUDS = [
  { x: 58, y: 26, scale: 1 },
  { x: 236, y: 22, scale: 0.8 },
  { x: 352, y: 30, scale: 1.1 },
];

const WINDOWS = BUILDINGS.flatMap((b) => {
  const cells: { x: number; y: number }[] = [];
  for (let y = b.y + 5; y < b.y + b.h - 6; y += 8) {
    for (let x = b.x + 3; x < b.x + b.w - 4; x += 6) cells.push({ x, y });
  }
  return cells;
});

/** Behind the sheet's rounded corners. */
export function heroBase(colors: ThemeColors, isDark: boolean) {
  return isDark ? '#3A1508' : colors.brand;
}

function scenePalette(colors: ThemeColors, isDark: boolean) {
  return isDark
    ? {
        skyTop: heroBase(colors, isDark),
        skyBottom: '#5A2210',
        sun: '#8A3A1F',
        cloud: '#8A3A1F',
        far: '#6E2A14',
        building: '#8F3C20',
        mid: '#4A1B0B',
        near: '#2E1006',
      }
    : {
        skyTop: heroBase(colors, isDark),
        skyBottom: '#FF7A4D',
        sun: '#FFD4C4',
        cloud: '#FFFFFF',
        far: '#FF9E7A',
        building: '#FFC4AD',
        mid: '#E5401A',
        near: '#C93210',
      };
}

type Props = {
  name: string;
  photo?: string | null;
  /** Today's numbers; null until the dashboard loads. */
  summary: string | null;
};

function HomeHeroBase({ name, photo, summary }: Props) {
  const { colors, resolved } = useTheme();
  const palette = scenePalette(colors, resolved === 'dark');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setRevealed(false), SUMMARY_MS);
    return () => clearTimeout(id);
  }, [revealed]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <LinearGradient
        colors={[palette.skyTop, palette.skyBottom]}
        style={StyleSheet.absoluteFill}
      />
      {/* Sized from the width alone and pinned to the bottom, so the status
          bar height can't zoom the scene or shift it against the sheet. */}
      <Svg
        width={width}
        height={(width * SCENE_HEIGHT) / SCENE_WIDTH}
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        style={styles.scene}
      >
        {CLOUDS.map((c) => (
          <G
            key={c.x}
            transform={`translate(${c.x} ${c.y}) scale(${c.scale})`}
            fill={palette.cloud}
            opacity={0.22}
          >
            <Ellipse cx="0" cy="6" rx="24" ry="7" />
            <Ellipse cx="-7" cy="1" rx="10" ry="8" />
            <Ellipse cx="8" cy="-1" rx="12" ry="10" />
          </G>
        ))}
        <Circle cx="200" cy="104" r="34" fill={palette.sun} opacity={0.4} />
        <Path
          d="M0 122 C60 106 130 110 190 120 S310 132 400 108 V170 H0 Z"
          fill={palette.far}
        />
        {BUILDINGS.map((b) => (
          <Rect
            key={b.x}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="2"
            fill={palette.building}
          />
        ))}
        {WINDOWS.map((w) => (
          <Rect
            key={`${w.x}-${w.y}`}
            x={w.x}
            y={w.y}
            width="3"
            height="4"
            fill={palette.mid}
            opacity={0.55}
          />
        ))}
        <Path
          d="M0 134 C70 122 150 126 220 132 S340 138 400 126 V170 H0 Z"
          fill={palette.mid}
        />
        <Path d="M0 138 C40 130 80 134 112 170 H0 Z" fill={palette.near} />
        <Path d="M400 132 C360 130 320 138 292 170 H400 Z" fill={palette.near} />
      </Svg>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.navigate('/(tabs)/profile')}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <UserAvatar uri={photo} name={name} size={50} style={styles.avatar} />
        </Pressable>

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed && summary ? summary : "Today's summary"}
            disabled={!summary}
            onPress={() => setRevealed((open) => !open)}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          >
            <Image source={FAVICON} style={styles.pillMark} resizeMode="contain" />
            <Text style={styles.pillText} numberOfLines={1}>
              {revealed && summary ? summary : "Today's summary"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search leads"
          onPress={() => {
            requestTabIntent({ screen: 'leads', value: 'search' });
            router.navigate('/(tabs)/leads');
          }}
          hitSlop={4}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <HugeiconsIcon
            icon={Search02Icon}
            size={21}
            color={INK}
            strokeWidth={1.8}
          />
        </Pressable>
        <SettingsIconButton size={21} color={INK} style={styles.action} />
      </View>
    </View>
  );
}

export const HomeHero = memo(HomeHeroBase);

/** The buttons stay white in dark mode, so their ink can't follow the theme. */
const INK = '#484848';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingBottom: SHEET_OVERLAP + 80,
    // The sheet is the next sibling, so this pulls it up over the scene.
    marginBottom: -SHEET_OVERLAP,
    overflow: 'hidden',
  },
  scene: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  identity: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 4,
  },
  name: {
    ...typography.subtitle,
    fontSize: 15,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  pillMark: { width: 22, height: 22 },
  pillText: {
    ...typography.caption,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: INK,
  },
  action: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pressed: { opacity: 0.8 },
});
