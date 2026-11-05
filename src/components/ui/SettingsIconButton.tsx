import { HugeiconsIcon } from '@hugeicons/react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Settings01Icon } from '@/components/icons/hugeicons';
import { useSettingsPendingCount } from '@/features/settings/useSettingsPendingCount';
import { radii, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  size?: number;
  color?: string;
  badgeColor?: string;
  /** Override navigation (defaults to Settings tab). */
  onPress?: () => void;
  hitSlop?: number;
  style?: StyleProp<ViewStyle>;
};

/** Settings gear + pending-setup badge — always opens the Settings page. */
export function SettingsIconButton({
  size = 22,
  color,
  badgeColor,
  onPress,
  hitSlop = 8,
  style,
}: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { count, refresh } = useSettingsPendingCount();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const openSettings = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.navigate('/(tabs)/profile');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count > 0 ? `Settings, ${count} setup required` : 'Open settings'
      }
      onPress={openSettings}
      hitSlop={hitSlop}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      <View style={styles.wrap}>
        <HugeiconsIcon
          icon={Settings01Icon}
          size={size}
          color={color ?? colors.text}
          strokeWidth={1.5}
        />
        {count > 0 ? (
          <View
            style={[styles.badge, badgeColor ? { backgroundColor: badgeColor } : null]}
          >
            <Text style={styles.badgeText}>
              {count > 99 ? '99+' : String(count)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    badgeText: {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
      color: colors.white,
    },
    pressed: { opacity: 0.85 },
  });
}
