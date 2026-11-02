import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/theme';

import { fetchUnreadCount, UNREAD_COUNT_KEY } from './notificationsApi';

export function NotificationBell({
  plain = false,
}: {
  /** Hisab header style — no chip background. */
  plain?: boolean;
}) {
  const router = useRouter();
  const { data: unread = 0 } = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
  });

  return (
    <Pressable
      onPress={() => router.push('/notifications')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
      }
      style={({ pressed }) => [
        plain ? styles.plain : styles.button,
        pressed && styles.pressed,
      ]}
    >
      <FontAwesome
        name="bell"
        size={plain ? 20 : 20}
        color={plain ? colors.text : colors.brand}
      />
      {unread > 0 ? (
        <View style={[styles.badge, plain && styles.badgePlain]}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
});
