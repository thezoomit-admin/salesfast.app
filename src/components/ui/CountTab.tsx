import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  /** Hidden until known (no "0" flash while counts load). */
  count?: number;
  active?: boolean;
  onPress: () => void;
};

/** Text tab + count badge — "All (35)  Open (14)" filter row. */
export function CountTab({ label, count, active = false, onPress }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <Text
        style={[styles.label, active && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count != null ? (
        <View style={[styles.badge, active && styles.badgeActive]}>
          <Text style={[styles.count, active && styles.countActive]}>
            {count > 999 ? '999+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Thin vertical rule between tab groups. */
export function CountTabDivider() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        width: 1,
        height: 18,
        marginHorizontal: 4,
        backgroundColor: colors.border,
      }}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tab: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 36,
      paddingHorizontal: 4,
    },
    pressed: { opacity: 0.7 },
    label: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.textMuted,
    },
    labelActive: {
      fontWeight: '600',
      color: colors.brand,
    },
    badge: {
      minWidth: 22,
      height: 18,
      paddingHorizontal: 6,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    badgeActive: {
      backgroundColor: colors.brand,
    },
    count: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    countActive: {
      color: colors.white,
    },
  });
}
