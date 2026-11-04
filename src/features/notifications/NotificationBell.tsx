import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Notification01Icon } from '@/components/icons/hugeicons';
import { radii, typography, useThemeColors, type ThemeColors } from '@/theme';

import { fetchUnreadCount, UNREAD_COUNT_KEY } from './notificationsApi';

export function NotificationBell({
  plain = false,
  circle = false,
}: {
  /** Hisab header style — no chip background. */
  plain?: boolean;
  /** White filled round chip (Testora home header). */
  circle?: boolean;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: unread = 0 } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
  });

  return (
    <Pressable
      onPress={() => router.navigate('/notifications')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
      }
      style={({ pressed }) => [
        circle ? styles.circle : plain ? styles.plain : styles.button,
        pressed && styles.pressed,
      ]}
    >
      <HugeiconsIcon
        icon={Notification01Icon}
        size={circle || plain ? 20 : 20}
        color={circle || plain ? colors.text : colors.brand}
        strokeWidth={1.8}
      />
      {unread > 0 ? (
        <View
          style={[
            styles.badge,
            plain && styles.badgePlain,
            circle && styles.badgeCircle,
          ]}
        >
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    plain: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 0,
    },
    pressed: { opacity: 0.7 },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    badgePlain: {
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      borderWidth: 0,
    },
    badgeCircle: {
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderWidth: 0,
    },
    badgeText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.white,
    },
  });
}
