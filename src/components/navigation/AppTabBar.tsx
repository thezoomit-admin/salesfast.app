import { HugeiconsIcon } from '@hugeicons/react-native';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  Notification01Icon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';

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
  notifications: 'Notifications',
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
  const routeCount = state.routes.length;

  // The highlighted tab is plain React state, and each tab fades its own
  // JS-driven value to exactly 0 or 1. Binding opacity to the pager's
  // native-driven `position` left tabs stuck half-lit: the native value is
  // not re-applied when nodes are swapped or the bar re-renders.
  const [active, setActive] = useState(state.index);
  const activeRef = useRef(state.index);
  const highlight = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActive(index);
  }, []);

  // While a tap scrolls the pager to its target, the pages it passes must
  // not light up.
  const tapTargetRef = useRef<number | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTap = useCallback(() => {
    tapTargetRef.current = null;
    if (tapTimerRef.current !== null) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = null;
  }, []);
  useEffect(() => endTap, [endTap]);

  // The settled index always wins (swipe end, back button, redirect).
  useEffect(() => {
    if (tapTargetRef.current !== null && tapTargetRef.current !== state.index) {
      endTap();
    }
    highlight(state.index);
  }, [state.index, endTap, highlight]);

  // Mid-swipe, follow the page nearest the finger so the highlight moves
  // before the pager settles.
  useEffect(() => {
    const id = position.addListener(({ value }) => {
      const target = tapTargetRef.current;
      if (target !== null) {
        if (Math.abs(value - target) < 0.01) endTap();
        return;
      }
      const nearest = Math.round(value);
      if (nearest >= 0 && nearest < routeCount) highlight(nearest);
    });
    return () => position.removeListener(id);
  }, [position, routeCount, endTap, highlight]);

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

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              endTap();
              tapTargetRef.current = routeIndex;
              // Fallback if the pager never reports reaching the target.
              tapTimerRef.current = setTimeout(endTap, 1000);
              highlight(routeIndex);
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
            <TabItem
              key={route.key}
              styles={styles}
              colors={colors}
              icon={TAB_ICONS[name]}
              label={label}
              badge={badges?.[name] || undefined}
              active={active === routeIndex}
              focused={focused}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const FADE_MS = 180;

type TabItemProps = {
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  icon: HugeIconData | undefined;
  label: string;
  badge: number | undefined;
  /** Drawn highlighted (follows taps and swipes ahead of `focused`). */
  active: boolean;
  /** The navigator's current tab. */
  focused: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({
  styles,
  colors,
  icon,
  label,
  badge,
  active,
  focused,
  accessibilityLabel,
  onPress,
  onLongPress,
}: TabItemProps) {
  const [on] = useState(() => new Animated.Value(active ? 1 : 0));
  const off = useMemo(
    () => on.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    [on]
  );
  useEffect(() => {
    // JS driver on purpose: the JS value stays the source of truth, so a
    // re-render can never commit a stale opacity.
    const animation = Animated.timing(on, {
      toValue: active ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, on]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.iconWrap}>
        {icon ? (
          <>
            <Animated.View style={[styles.iconLayer, { opacity: off }]}>
              <HugeiconsIcon
                icon={icon}
                size={24}
                color={colors.textMuted}
                strokeWidth={1.7}
              />
            </Animated.View>
            <Animated.View style={[styles.iconLayer, { opacity: on }]}>
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
      <Animated.Text style={[styles.label, { opacity: on }]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
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
