import { HugeiconsIcon } from '@hugeicons/react-native';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useMemo, useState, type ComponentProps } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
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

const BAR_PADDING_X = 8;
const PILL_WIDTH = 56;

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
  const [barWidth, setBarWidth] = useState(0);

  const routesByName = Object.fromEntries(
    state.routes.map((route) => [route.name, route])
  );

  // `position` is the pager's live page offset (native-driven), so the pill
  // follows the finger during a swipe and animates the same way on tab press.
  const pillTranslateX = useMemo(() => {
    const itemWidth = (barWidth - BAR_PADDING_X * 2) / TAB_ORDER.length;
    const slotX = state.routes.map((route) => {
      const slot = TAB_ORDER.indexOf(route.name as (typeof TAB_ORDER)[number]);
      return BAR_PADDING_X + Math.max(slot, 0) * itemWidth + (itemWidth - PILL_WIDTH) / 2;
    });
    if (slotX.length < 2) return slotX[0] ?? 0;
    return position.interpolate({
      inputRange: state.routes.map((_, i) => i),
      outputRange: slotX,
      extrapolate: 'clamp',
    });
  }, [barWidth, position, state.routes]);

  const onBarLayout = (e: LayoutChangeEvent) =>
    setBarWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={styles.bar} onLayout={onBarLayout}>
        {barWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { transform: [{ translateX: pillTranslateX }] }]}
          />
        ) : null}
        {TAB_ORDER.map((name) => {
          const route = routesByName[name];
          if (!route) return null;

          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === routeIndex;
          const { options } = descriptors[route.key];
          const label = TAB_LABELS[name] ?? options.title ?? name;
          const icon = TAB_ICONS[name];
          const color = focused ? colors.brand : colors.textMuted;
          const badge = badges?.[name] || undefined;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
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
                  <HugeiconsIcon
                    icon={icon}
                    size={24}
                    color={color}
                    strokeWidth={focused ? 2.1 : 1.7}
                  />
                ) : null}
                {badge != null ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {focused ? (
                <Text style={styles.label} numberOfLines={1}>
                  {label}
                </Text>
              ) : (
                <View style={styles.labelSpacer} />
              )}
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
      paddingHorizontal: BAR_PADDING_X,
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
    pill: {
      position: 'absolute',
      left: 0,
      top: 8,
      width: PILL_WIDTH,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.brandSoft,
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
    label: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      color: colors.brand,
      textAlign: 'center',
    },
    labelSpacer: {
      height: 14,
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
