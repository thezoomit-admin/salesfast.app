import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/api/client';

/** Must match PUSH_CHANNEL_ID on the backend (utils/pushNotification). */
export const PUSH_CHANNEL_ID = 'default';

export type PushSetupResult =
  | { status: 'registered'; token: string }
  | {
      status: 'denied' | 'unsupported' | 'error';
      reason: string;
    };

/** Remote push needs a real device and a dev/preview/production build. */
export function isPushSupported() {
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  // Expo Go (SDK 53+) has no remote push on Android.
  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return false;
  }
  return true;
}

/**
 * Android 8+ shows heads-up (pop-up) banners only for HIGH/MAX channels, and
 * Android 13+ shows the permission prompt only once a channel exists.
 */
export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: 'CRM alerts',
    description: 'Lead assignments, follow-up reminders and CRM updates',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0F3D3E',
    sound: 'default',
    showBadge: true,
  });
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function easProjectId() {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Ask for permission (first run only), fetch this install's Expo push token
 * and bind it to the signed-in session on the backend.
 */
export async function registerForPushNotifications(): Promise<PushSetupResult> {
  if (!isPushSupported()) {
    return {
      status: 'unsupported',
      reason: 'Push needs a physical device and an installed (non-Expo Go) build.',
    };
  }
  try {
    await ensureNotificationChannel();
    const granted = await ensurePermission();
    if (!granted) {
      return {
        status: 'denied',
        reason: 'Notifications are turned off for this app in system settings.',
      };
    }
    const projectId = easProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await api.put('/auth/mobile/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    return { status: 'registered', token };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'Push setup failed',
    };
  }
}

/** Stop pushes to this install for the current session (best-effort). */
export async function unregisterPushNotifications() {
  if (!isPushSupported()) return;
  try {
    await api.delete('/auth/mobile/push-token');
  } catch {
    // Server also clears the token when the session is revoked on logout.
  }
}

/** Remove delivered notifications + badge (e.g. after sign-out). */
export async function clearDeliveredNotifications() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // Not fatal.
  }
}
