import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { authColors } from '../authTheme';

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={authColors.white} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={styles.label}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: authColors.primaryPressed },
  disabled: { opacity: 0.55 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: authColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
