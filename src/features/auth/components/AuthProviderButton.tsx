import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors } from '../authTheme';

type Props = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
};

/**
 * Outlined continue CTA — left icon chip, label, trailing arrow.
 * Keeps the previous outline look, with clearer hierarchy.
 */
export function AuthProviderButton({ label, onPress, icon }: Props) {
  return (
    <View style={styles.shell}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{ color: 'rgba(242, 70, 28, 0.08)' }}
        style={({ pressed }) => [styles.press, pressed ? styles.pressed : null]}
      >
        <View style={styles.left}>
          {icon ? <View style={styles.iconChip}>{icon}</View> : null}
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={18}
          color={authColors.muted}
          strokeWidth={1.8}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    minHeight: 56,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    overflow: 'hidden',
  },
  press: {
    minHeight: 56,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  pressed: {
    backgroundColor: '#F5F6F7',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F4',
  },
  label: {
    flexShrink: 1,
    color: authColors.text,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
});
