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

export type LeadDetailTab = 'overview' | 'history' | 'calls' | 'views';

const TABS: {
  key: LeadDetailTab;
  label: string;
  icon: HugeIconData;
}[] = [
  { key: 'overview', label: 'Overview', icon: UserIcon },
  { key: 'history', label: 'History', icon: Calendar03Icon },
  { key: 'calls', label: 'Call History', icon: CallIcon },
  { key: 'views', label: 'View History', icon: EyeIcon },
];

const TAB_BAR_CONTENT_HEIGHT = 56;

type Props = {
  active: LeadDetailTab;
  onChange: (tab: LeadDetailTab) => void;
};

/** Dedicated bottom menu — local tab state only (no router / navigation.emit). */
export function LeadDetailTabBar({ active, onChange }: Props) {
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
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const tint = isActive ? colors.brand : colors.textMuted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.key)}
            style={styles.item}
          >
            <HugeiconsIcon
              icon={tab.icon}
              size={22}
              color={tint}
              strokeWidth={1.8}
            />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {tab.label}
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
