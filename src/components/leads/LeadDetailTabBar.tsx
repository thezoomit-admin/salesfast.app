import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CallIcon,
  Clock01Icon,
  EyeIcon,
  Home03Icon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

export type LeadDetailTab = 'overview' | 'history' | 'calls' | 'views';

type BarItem =
  | { kind: 'tab'; key: LeadDetailTab; label: string; icon: HugeIconData }
  | { kind: 'home'; label: string; icon: HugeIconData };

/** Home in the middle — same chrome language as the main AppTabBar. */
const ITEMS: BarItem[] = [
  { kind: 'tab', key: 'overview', label: 'Overview', icon: UserIcon },
  { kind: 'tab', key: 'history', label: 'History', icon: Clock01Icon },
  { kind: 'home', label: 'Home', icon: Home03Icon },
  { kind: 'tab', key: 'calls', label: 'Calls', icon: CallIcon },
  { kind: 'tab', key: 'views', label: 'Views', icon: EyeIcon },
];

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
  const styles = useMemo(
    () => createStyles(colors, bottomInset),
    [colors, bottomInset]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          if (item.kind === 'home') {
            return (
              <Pressable
                key="home"
                accessibilityRole="button"
                accessibilityLabel="Go to home"
                onPress={() => router.navigate('/(tabs)')}
                style={({ pressed }) => [
                  styles.item,
                  pressed && styles.itemPressed,
                ]}
              >
                <View style={styles.iconWrap}>
                  <HugeiconsIcon
                    icon={item.icon}
                    size={24}
                    color={colors.text}
                    strokeWidth={1.7}
                  />
                </View>
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
          const tint = isActive ? colors.brand : colors.text;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange(item.key)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
            >
              <View style={styles.iconWrap}>
                <HugeiconsIcon
                  icon={item.icon}
                  size={24}
                  color={tint}
                  strokeWidth={isActive ? 2.1 : 1.7}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.brand : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, bottomInset: number) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.surface,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingTop: 8,
      paddingBottom: bottomInset,
      paddingHorizontal: 8,
      minHeight: 52 + bottomInset,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      gap: 2,
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
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
