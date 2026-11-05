import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo, useState, type ComponentType } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { HomeSection } from '@/components/home/HomeSection';
import {
  QuickActionIcons,
  QuickActionTints,
  type QuickActionIconKey,
} from '@/components/home/QuickActionIcons';
import { ArrowDown01Icon } from '@/components/icons/hugeicons';
import { requestTabIntent, type TabIntent } from '@/lib/tabIntent';
import { typography, useTheme, type ThemeColors } from '@/theme';

type Tile = {
  key: QuickActionIconKey;
  label: string;
  href: Href;
  intent?: TabIntent;
};

const TILE = 56;
const ICON = 34;
/** Other services tiles — a bit smaller than the main grid. */
const OTHER_ICON = 30;

/** Two full rows when collapsed; the row after them peeks under the toggle. */
const COLLAPSED_COUNT = 8;
const ROW_GAP = 20;
const STACK_GAP = 14;
const LABEL_GAP = 8;
const LABEL_LINE = 18;
/** Until the extra tiles report their real height (larger with big system text). */
const ONE_ROW_HEIGHT = TILE + LABEL_GAP + LABEL_LINE;
/** How far the collapsed toggle climbs to sit over the peeking row. */
const TOGGLE_OVERLAP = TILE / 2 + 32;
const PEEK_OPACITY = 0.22;
const TOGGLE_MS = 280;

const TILES: Tile[] = [
  { key: 'leads', label: 'Leads', href: '/(tabs)/leads' },
  { key: 'add-lead', label: 'Add Lead', href: '/leads/new' },
  { key: 'follow-ups', label: 'Follow-ups', href: '/(tabs)/follow-ups' },
  { key: 'calls', label: 'Calls', href: '/(tabs)/calls' },
  {
    key: 'search',
    label: 'Search',
    href: '/(tabs)/leads',
    intent: { screen: 'leads', value: 'search' },
  },
  { key: 'activities', label: 'Activities', href: '/activities' },
  { key: 'inbox', label: 'Inbox', href: '/(tabs)/notifications' },
  { key: 'call-sync', label: 'Call Sync', href: '/call-sync/setup' },
  {
    key: 'overdue',
    label: 'Overdue',
    href: '/(tabs)/follow-ups',
    intent: { screen: 'follow-ups', value: 'overdue' },
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    href: '/(tabs)/follow-ups',
    intent: { screen: 'follow-ups', value: 'upcoming' },
  },
  {
    key: 'calendar',
    label: 'Calendar',
    href: '/(tabs)/follow-ups',
    intent: { screen: 'follow-ups', value: 'calendar' },
  },
  {
    key: 'unread',
    label: 'Unread',
    href: '/(tabs)/leads',
    intent: { screen: 'leads', value: 'unread' },
  },
];

const MAIN_TILES = TILES.slice(0, COLLAPSED_COUNT);
const EXTRA_TILES = TILES.slice(COLLAPSED_COUNT);

const OTHER_TILES: Tile[] = [
  { key: 'profile', label: 'Edit Profile', href: '/settings/edit' },
  { key: 'alerts', label: 'Alerts', href: '/settings/notifications' },
  { key: 'settings', label: 'Settings', href: '/(tabs)/profile' },
  { key: 'about', label: 'App Info', href: '/settings/about' },
];

function TileGrid({
  tiles,
  iconSize = ICON,
}: {
  tiles: Tile[];
  iconSize?: number;
}) {
  const { colors, resolved } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isDark = resolved === 'dark';
  const tintMode = isDark ? 'dark' : 'light';
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => {
        const Icon = QuickActionIcons[tile.key] as ComponentType<{ size?: number }>;
        return (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            onPress={() => {
              if (tile.intent) requestTabIntent(tile.intent);
              router.navigate(tile.href);
            }}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View
              collapsable={false}
              style={[
                styles.iconTile,
                { backgroundColor: QuickActionTints[tile.key][tintMode] },
              ]}
            >
              <Icon size={iconSize} />
            </View>
            <Text
              style={[styles.label, !isDark && styles.labelInk]}
              numberOfLines={1}
            >
              {tile.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HomeQuickActionsBase() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [extraHeight, setExtraHeight] = useState(ONE_ROW_HEIGHT);
  /** Height and margin can't run on the native driver, so all of it stays on JS. */
  const [progress] = useState(() => new Animated.Value(0));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: TOGGLE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.root}>
      <TileGrid tiles={MAIN_TILES} />

      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.extra,
          {
            height: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [TILE, extraHeight],
            }),
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [PEEK_OPACITY, 1],
            }),
          },
        ]}
      >
        {/* Absolute, so it keeps its full height while the clip above animates. */}
        <View
          style={styles.extraContent}
          onLayout={(event) => setExtraHeight(event.nativeEvent.layout.height)}
        >
          <TileGrid tiles={EXTRA_TILES} />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          marginTop: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [-TOGGLE_OVERLAP, 0],
          }),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={toggle}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Text style={styles.toggleText}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '180deg'],
                  }),
                },
              ],
            }}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={16}
              color={colors.brand}
              strokeWidth={2.2}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export const HomeQuickActions = memo(HomeQuickActionsBase);

function HomeOtherServicesBase() {
  return (
    <HomeSection title="Other services">
      <TileGrid tiles={OTHER_TILES} iconSize={OTHER_ICON} />
    </HomeSection>
  );
}

export const HomeOtherServices = memo(HomeOtherServicesBase);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { alignItems: 'center', gap: STACK_GAP },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignSelf: 'stretch',
      rowGap: ROW_GAP,
    },
    tile: {
      width: '25%',
      alignItems: 'center',
      gap: LABEL_GAP,
    },
    pressed: { opacity: 0.7 },
    iconTile: {
      width: TILE,
      height: TILE,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: LABEL_LINE,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    /** Darker than colors.text, so the labels hold up beside the tinted tiles. */
    labelInk: { color: '#15202C' },
    extra: {
      alignSelf: 'stretch',
      marginTop: ROW_GAP - STACK_GAP,
      overflow: 'hidden',
    },
    extraContent: { position: 'absolute', top: 0, left: 0, right: 0 },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    toggleText: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '600',
      color: colors.brand,
    },
  });
}
