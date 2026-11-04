import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Calendar03Icon,
  CallIcon,
  EyeIcon,
  Home03Icon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { spacing, useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

export type LeadDetailTab = 'overview' | 'history' | 'calls' | 'views';

type BarItem =
  | { kind: 'tab'; key: LeadDetailTab; label: string; icon: HugeIconData }
  | { kind: 'home'; label: string; icon: HugeIconData };

/** Home sits in the middle of the four lead tabs. */
const ITEMS: BarItem[] = [
  { kind: 'tab', key: 'overview', label: 'Overview', icon: UserIcon },
  { kind: 'tab', key: 'history', label: 'History', icon: Calendar03Icon },
  { kind: 'home', label: 'Home', icon: Home03Icon },
  { kind: 'tab', key: 'calls', label: 'Call History', icon: CallIcon },
  { kind: 'tab', key: 'views', label: 'View History', icon: EyeIcon },
];

const TAB_BAR_CONTENT_HEIGHT = 56;

type Props = {
  active: LeadDetailTab;
  onChange: (tab: LeadDetailTab) => void;
};

/** Dedicated bottom menu — local tabs + center Home → app home. */
export function LeadDetailTabBar({ active, onChange }: Props) {
  const router = useRouter();
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
      {ITEMS.map((item) => {
        if (item.kind === 'home') {
          return (
            <Pressable
              key="home"
              accessibilityRole="button"
              accessibilityLabel="Go to home"
              onPress={() => router.navigate('/(tabs)')}
              style={styles.item}
            >
              <HugeiconsIcon
                icon={item.icon}
                size={22}
                color={colors.textMuted}
                strokeWidth={1.8}
              />
              <Text
                style={[styles.label, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }

        const isActive = active === item.key;
        const tint = isActive ? colors.brand : colors.textMuted;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(item.key)}
            style={styles.item}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={22}
              color={tint}
              strokeWidth={1.8}
            />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {item.label}
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
