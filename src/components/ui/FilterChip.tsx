import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Compact filter pill — Hisab FilterChip, Salesfast brand tokens. */
export function FilterChip({ label, active = false, onPress, style }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, style]}
    >
      <Text
        style={[styles.label, active && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chip: {
      flexShrink: 0,
      minHeight: 36,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radii.sm,
      borderWidth: 0.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.text,
    },
    labelActive: {
      color: colors.white,
    },
  });
}
