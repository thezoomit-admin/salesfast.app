import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { Mail01Icon, SmartPhone01Icon } from '@/components/icons/hugeicons';
import { authColors } from '../authTheme';

export type AuthMethod = 'email' | 'phone';

type Props = {
  method: AuthMethod;
  title: string;
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

export function SocialButton({
  method,
  title,
  onPress,
  compact,
  style,
}: Props) {
  const icon =
    method === 'email' ? (
      <HugeiconsIcon
        icon={Mail01Icon}
        size={compact ? 18 : 20}
        color={authColors.primary}
        strokeWidth={1.8}
      />
    ) : (
      <HugeiconsIcon
        icon={SmartPhone01Icon}
        size={compact ? 18 : 20}
        color={authColors.primary}
        strokeWidth={1.8}
      />
    );

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={[styles.label, compact ? styles.compactLabel : null]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: authColors.white,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  compact: {
    minHeight: 48,
    flex: 1,
  },
  pressed: { backgroundColor: '#F9FAFB' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: authColors.text,
  },
  compactLabel: {
    fontSize: 13,
  },
});
