import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Calendar03Icon,
  CallIcon,
  EyeIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { spacing, useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

/** Minimal shape from React Navigation tabBar props (avoid hard dep on package types). */
type TabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: {
      type: string;
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const TAB_META: Record<
  string,
  { label: string; icon: HugeIconData }
> = {
  index: { label: 'Overview', icon: UserIcon },
  history: { label: 'History', icon: Calendar03Icon },
  calls: { label: 'Call History', icon: CallIcon },
  views: { label: 'View History', icon: EyeIcon },
};

const TAB_BAR_CONTENT_HEIGHT = 56;

/** Dedicated bottom menu for lead detail sub-pages (matches app tab bar). */
export function LeadDetailTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name] ?? {
          label: descriptors[route.key]?.options.title ?? route.name,
          icon: UserIcon,
        };
        const isActive = state.index === index;
        const tint = isActive ? colors.brand : colors.textMuted;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={onPress}
            style={styles.item}
          >
            <HugeiconsIcon
              icon={meta.icon}
              size={22}
              color={tint}
              strokeWidth={1.8}
            />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingHorizontal: spacing.xs,
    },
    label: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
