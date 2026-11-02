import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '../authTheme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
};

/**
 * Outlined continue CTA — LeadIQ-style centered icon + label.
 */
export function AuthProviderButton({ label, onPress, icon }: Props) {
  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
        style={({ pressed }) => [styles.press, pressed ? styles.pressed : null]}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    minHeight: 52,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
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
    backgroundColor: '#FAFAFA',
  },
  label: {
    color: authColors.text,
    fontSize: 15,
    fontWeight: '500',
  },
});
