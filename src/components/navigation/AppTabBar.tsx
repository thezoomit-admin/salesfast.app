import { HugeiconsIcon } from '@hugeicons/react-native';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useMemo, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AccountSetting02Icon,
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { prepareTabEnter, TAB_ORDER } from '@/components/navigation/TabSwipe';
import { typography, useTheme, type ThemeColors } from '@/theme';

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

export function AppTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors, resolved } = useTheme();
  const bottomInset = Math.max(insets.bottom, 8);
  const styles = useMemo(
    () => createStyles(colors, resolved === 'dark', bottomInset),
    [colors, resolved, bottomInset]
  );

  const routesByName = Object.fromEntries(
    state.routes.map((route) => [route.name, route])
  );

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
          const color = focused ? colors.brand : colors.textMuted;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              prepareTabEnter(state.routes[state.index].name, name);
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
                      {typeof badge === 'number' && badge > 99
                        ? '99+'
                        : String(badge)}
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
