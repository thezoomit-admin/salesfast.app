import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
const COLUMNS = 4;

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

  return (
    <View style={styles.root}>
      <TileGrid tiles={expanded ? TILES : TILES.slice(0, COLLAPSED_COUNT)} />

      {expanded ? null : (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.peek}
        >
          <TileGrid
            tiles={TILES.slice(COLLAPSED_COUNT, COLLAPSED_COUNT + COLUMNS)}
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((open) => !open)}
        style={({ pressed }) => [
          styles.toggle,
          !expanded && styles.toggleOverPeek,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.toggleText}>
          {expanded ? 'Show less' : 'Show more'}
        </Text>
        <View style={expanded ? styles.chevronUp : undefined}>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            color={colors.brand}
            strokeWidth={2.2}
          />
        </View>
      </Pressable>
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
    root: { alignItems: 'center', gap: 14 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignSelf: 'stretch',
      rowGap: 20,
    },
    tile: {
      width: '25%',
      alignItems: 'center',
      gap: 8,
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
      lineHeight: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    /** Darker than colors.text, so the labels hold up beside the tinted tiles. */
    labelInk: { color: '#15202C' },
    peek: {
      alignSelf: 'stretch',
      height: TILE,
      marginTop: 2,
      overflow: 'hidden',
      opacity: 0.22,
    },
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
    toggleOverPeek: { marginTop: -(TILE / 2 + 32) },
    toggleText: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '600',
      color: colors.brand,
    },
    chevronUp: { transform: [{ rotate: '180deg' }] },
  });
}
