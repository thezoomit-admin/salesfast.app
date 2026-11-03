import { HugeiconsIcon } from '@hugeicons/react-native';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AccountSetting02Icon,
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';

/** Visual tab order — Home centered. Also the swipe order of the pager. */
export const TAB_ORDER = [
  'leads',
  'follow-ups',
  'index',
  'calls',
  'profile',
] as const;

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

const TAB_ICONS: Record<string, HugeIconData> = {
  leads: PermanentJobIcon,
  'follow-ups': Calendar03Icon,
  index: Home03Icon,
  calls: CallIcon,
  profile: AccountSetting02Icon,
};

const TAB_LABELS: Record<string, string> = {
  leads: 'Leads',
  'follow-ups': 'Follow-ups',
  index: 'Home',
  calls: 'Calls',
  profile: 'Profile',
};

type AppTabBarProps = MaterialTopTabBarProps & {
  /** Badge counts keyed by route name; 0 hides the badge. */
  badges?: Partial<Record<string, number>>;
};

export function AppTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
  position,
  badges,
}: AppTabBarProps) {
  const { colors, resolved } = useTheme();
  const bottomInset = Math.max(insets.bottom, 8);
  const styles = useMemo(
    () => createStyles(colors, resolved === 'dark', bottomInset),
    [colors, resolved, bottomInset]
  );

  const routesByName = Object.fromEntries(
    state.routes.map((route) => [route.name, route])
  );

  // Highlight runs on the UI thread off the pager's live `position`, snapping
  // to a tab the moment its page is more than half on screen. Waiting for
  // `state.index` lags: it updates after the pager settles and the whole
  // navigator re-renders on the JS thread.
  const highlights = useMemo(
    () =>
      state.routes.map((_, i) => {
        const inputRange = [i - 0.5, i - 0.499, i + 0.499, i + 0.5];
        return {
          on: position.interpolate({
            inputRange,
            outputRange: [0, 1, 1, 0],
            extrapolate: 'clamp',
          }),
          off: position.interpolate({
            inputRange,
            outputRange: [1, 0, 0, 1],
            extrapolate: 'clamp',
          }),
        };
      }),
    [position, state.routes]
  );

  // A tapped tab lights up at once and holds while the pager scrolls past the
  // pages in between, then hands back to the live highlight.
  const [pressTarget, setPressTarget] = useState<number | null>(null);
  const [seenIndex, setSeenIndex] = useState(state.index);
  if (seenIndex !== state.index) {
    setSeenIndex(state.index);
    // Swiped elsewhere, back button or redirect before the tap finished.
    if (pressTarget !== null && state.index !== pressTarget) setPressTarget(null);
  }
  useEffect(() => {
    if (pressTarget === null) return;
    const id = position.addListener(({ value }) => {
      if (Math.round(value) === pressTarget) setPressTarget(null);
    });
    return () => position.removeListener(id);
  }, [position, pressTarget]);

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={styles.bar}>
        {TAB_ORDER.map((name) => {
          const route = routesByName[name];
          if (!route) return null;

          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === routeIndex;
          const { options } = descriptors[route.key];
          const label = TAB_LABELS[name] ?? options.title ?? name;
          const icon = TAB_ICONS[name];
          const badge = badges?.[name] || undefined;
          const highlight =
            pressTarget === null
              ? highlights[routeIndex]
              : pressTarget === routeIndex
                ? { on: 1, off: 0 }
                : { on: 0, off: 1 };

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              setPressTarget(routeIndex);
              // Next frame, so the highlight paints before the navigator's
              // re-render occupies the JS thread.
              requestAnimationFrame(() => navigateToTab(route.key));
            }
          };

          const onLongPress = () => {
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                {icon ? (
                  <>
                    <Animated.View style={[styles.iconLayer, { opacity: highlight.off }]}>
                      <HugeiconsIcon
                        icon={icon}
                        size={24}
                        color={colors.textMuted}
                        strokeWidth={1.7}
                      />
                    </Animated.View>
                    <Animated.View style={[styles.iconLayer, { opacity: highlight.on }]}>
                      <HugeiconsIcon
                        icon={icon}
                        size={24}
                        color={colors.brand}
                        strokeWidth={2.1}
                      />
                    </Animated.View>
                  </>
                ) : null}
                {badge != null ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Animated.Text
                style={[styles.label, { opacity: highlight.on }]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean, bottomInset: number) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: 'transparent',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 12,
      paddingBottom: bottomInset,
      paddingHorizontal: 8,
      minHeight: 56 + bottomInset,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 12,
        },
        default: {},
      }),
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 4,
      paddingVertical: 2,
      minHeight: 48,
    },
    itemPressed: {
      opacity: 0.72,
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
    label: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: colors.brand,
      textAlign: 'center',
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
      backgroundColor: colors.brand,
    },
    badgeText: {
      color: colors.white,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    },
  });
}
