import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { spacing, useTheme } from '@/theme';

import { inboxPalette } from './inboxPalette';
import {
  registerForPushNotifications,
  usePushStatus,
} from './pushRegistration';

/**
 * Pop-ups can't reach this phone: notifications were refused in Android
 * settings, or setup failed. Without this the inbox looks fine while the
 * phone stays silent. Returning from Settings re-runs setup (see
 * NotificationsBootstrap), so the banner clears itself once allowed.
 */
export function PushStatusBanner() {
  const status = usePushStatus();
  const { user } = useAuth();
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const [retrying, setRetrying] = useState(false);

  if (!user || !status) return null;
  if (status.status !== 'denied' && status.status !== 'error') return null;

  const denied = status.status === 'denied';
  const tone = palette.tones.amber;

  const onPress = async () => {
    if (denied) {
      void Linking.openSettings();
      return;
    }
    setRetrying(true);
    await registerForPushNotifications(user.id);
    setRetrying(false);
  };

  return (
    <View style={[styles.box, { backgroundColor: tone.bg }]}>
      <Ionicons
        name="notifications-off-outline"
        size={20}
        color={tone.fg}
        style={styles.icon}
      />
      <View style={styles.body}>
        <Text style={[styles.title, { color: tone.fg }]}>
          {denied
            ? 'Pop-up notifications are off'
            : 'Notifications could not be set up'}
        </Text>
        <Text style={[styles.text, { color: palette.inkSoft }]}>
          {denied
            ? 'Allow notifications for SalesFast to get overdue follow-ups and new leads on this phone.'
            : status.reason}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={retrying}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: tone.fg },
          (pressed || retrying) && styles.pressed,
        ]}
      >
        <Text style={styles.actionText}>
          {denied ? 'Open settings' : retrying ? 'Trying…' : 'Try again'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
  },
  icon: { alignSelf: 'flex-start', marginTop: 2 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700' },
  text: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
