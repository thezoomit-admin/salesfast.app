import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { authColors } from '../authTheme';

type Props = {
  onPress?: () => void;
};

export function BackButton({ onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed ? styles.pressed : null]}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={20} color={authColors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: authColors.backBtnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
