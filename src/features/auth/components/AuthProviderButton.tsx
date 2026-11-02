import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
};

/**
 * Outlined continue CTA — LeadIQ-style centered icon + label.
 */
export function AuthProviderButton({ label, onPress, icon }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{
          color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
        style={({ pressed }) => [styles.press, pressed ? styles.pressed : null]}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    shell: {
      width: '100%',
      minHeight: 52,
      marginBottom: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surface : colors.white,
      overflow: 'hidden',
    },
    press: {
      minHeight: 52,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
    },
    pressed: {
      backgroundColor: isDark ? colors.surfaceMuted : '#FAFAFA',
    },
    label: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '500',
    },
  });
}
