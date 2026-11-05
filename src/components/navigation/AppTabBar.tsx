import { HugeiconsIcon } from '@hugeicons/react-native';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type ComponentProps,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  Notification01Icon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { useTheme, type ThemeColors } from '@/theme';

/** Visual tab order — Home centered. Also the page order of the pager. */
export const TAB_ORDER = [
  'leads',
  'follow-ups',
  'index',
  'calls',
  'notifications',
] as const;

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

const TAB_ICONS: Record<string, HugeIconData> = {
  leads: PermanentJobIcon,
  'follow-ups': Calendar03Icon,
  index: Home03Icon,
  calls: CallIcon,
  notifications: Notification01Icon,
};

const TAB_LABELS: Record<string, string> = {
  leads: 'Leads',
  'follow-ups': 'Follow-ups',
  index: 'Home',
  calls: 'Calls',
  notifications: 'Inbox',
};

type AppTabBarProps = MaterialTopTabBarProps & {
  /** Badge counts keyed by route name; 0 hides the badge. */
  badges?: Partial<Record<string, number>>;
};

export function AppTabBar({
  state,
  descriptors,
  emitter,
  jumpTo,
  insets,
  badges,
}: AppTabBarProps) {
  const { colors } = useTheme();
  // Real system inset only — edge-to-edge paints brand under the nav buttons.
  const systemInset = insets.bottom;
  const styles = useMemo(
    () => createStyles(colors, systemInset),
    [colors, systemInset]
  );

  const routesByName = Object.fromEntries(
    state.routes.map((route) => [route.name, route])
  );
  const focusedName = state.routes[state.index]?.name;

  // The tab under the finger lights on touch-down, so its colour is on screen
  // before the finger lifts and before the navigator's render starts. Once
  // the finger is gone the navigator's index decides again, which also covers
  // the back button, redirects and a press that slides off the tab.
  const [pressedName, setPressedName] = useState<string | null>(null);
  const activeName = pressedName ?? focusedName;

  const onTabPressIn = useCallback((name: string) => {
    setPressedName(name);
  }, []);

  // Pressable can delay this until after the next tab's touch-down.
  const onTabPressOut = useCallback((name: string) => {
    setPressedName((current) => (current === name ? null : current));
  }, []);

  const onTabPress = useCallback(
    (routeKey: string, focused: boolean) => {
      const event = emitter.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        // Tells the pager straight away. `navigateToTab` goes through the
        // router's queue, which costs extra renders before the page moves.
        jumpTo(routeKey);
      }
    },
    [emitter, jumpTo]
  );

  const onTabLongPress = useCallback(
    (routeKey: string) => {
      emitter.emit({ type: 'tabLongPress', target: routeKey });
    },
    [emitter]
  );

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={styles.bar}>
        {TAB_ORDER.map((name) => {
          const route = routesByName[name];
          if (!route) return null;

          const { options } = descriptors[route.key];
          const label = TAB_LABELS[name] ?? options.title ?? name;

          return (
            <TabItem
              // By name: a route's key changes when its page is preloaded.
              key={name}
              name={name}
              routeKey={route.key}
              styles={styles}
              colors={colors}
              icon={TAB_ICONS[name]}
              label={label}
              badge={badges?.[name] || undefined}
              active={activeName === name}
              focused={focusedName === name}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onTabPressIn={onTabPressIn}
              onTabPressOut={onTabPressOut}
              onTabPress={onTabPress}
              onTabLongPress={onTabLongPress}
            />
          );
        })}
      </View>
      {/* Edge-to-edge: system nav is transparent — paint brand under the inset. */}
      {systemInset > 0 ? <View style={styles.systemBar} /> : null}
    </View>
  );
}

const TabIcon = memo(HugeiconsIcon);

type TabItemProps = {
  name: string;
  routeKey: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  icon: HugeIconData | undefined;
  label: string;
  badge: number | undefined;
  /** Drawn highlighted (follows the finger ahead of `focused`). */
  active: boolean;
  /** The navigator's current tab. */
  focused: boolean;
  accessibilityLabel: string;
  onTabPressIn: (name: string) => void;
  onTabPressOut: (name: string) => void;
  onTabPress: (routeKey: string, focused: boolean) => void;
  onTabLongPress: (routeKey: string) => void;
};

/** Memoized: a tab switch re-renders only the two tabs whose colour changes. */
const TabItem = memo(function TabItem({
  name,
  routeKey,
  styles,
  colors,
  icon,
  label,
  badge,
  active,
  focused,
  accessibilityLabel,
  onTabPressIn,
  onTabPressOut,
  onTabPress,
  onTabLongPress,
}: TabItemProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => onTabPressIn(name)}
      onPressOut={() => onTabPressOut(name)}
      onPress={() => onTabPress(routeKey, focused)}
      onLongPress={() => onTabLongPress(routeKey)}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        {icon ? (
          <>
            {/* Both colours stay drawn, so a switch is one opacity change with
                no animation or SVG redraw. `collapsable` keeps these views
                from being flattened away when their opacity flips. */}
            <View
              collapsable={false}
              style={[styles.iconLayer, active && styles.iconHidden]}
            >
              <TabIcon
                icon={icon}
                size={24}
                color={colors.text}
                strokeWidth={1.7}
              />
            </View>
            <View
              collapsable={false}
              style={[styles.iconLayer, !active && styles.iconHidden]}
            >
              <TabIcon
                icon={icon}
                size={24}
                color={colors.brand}
                strokeWidth={2.1}
              />
            </View>
          </>
        ) : null}
        {badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.brand }]}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.label,
          { color: active ? colors.brand : colors.textSecondary },
          active && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors, systemInset: number) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.brand,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingTop: 6,
      paddingBottom: 8,
      paddingHorizontal: 4,
      minHeight: 64,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    systemBar: {
      height: systemInset,
      backgroundColor: colors.brand,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight: 44,
      minWidth: 0,
    },
    iconWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconLayer: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconHidden: {
      opacity: 0,
    },
    label: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '500',
    },
    labelActive: {
      fontWeight: '600',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -10,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: colors.white,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    },
  });
}
