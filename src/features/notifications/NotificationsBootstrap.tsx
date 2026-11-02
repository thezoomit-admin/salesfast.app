import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { secureStorage } from '@/services/secureStorage';

import {
  fetchUnreadCount,
  markNotificationRead,
  NOTIFICATIONS_KEY,
  UNREAD_COUNT_KEY,
} from './notificationsApi';
import {
  clearDeliveredNotifications,
  isPushSupported,
  registerForPushNotifications,
} from './pushRegistration';

/**
 * While the app is open, still show the system pop-up (heads-up banner).
 * Nobody signed in on this install → stay silent (a stale session's push).
 */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const signedIn = !!(await secureStorage.getAccessToken().catch(() => null));
      return {
        shouldShowBanner: signedIn,
        shouldShowList: signedIn,
        shouldPlaySound: signedIn,
        shouldSetBadge: signedIn,
      };
    },
  });
}

/** Only in-app routes the backend is allowed to deep-link into. */
function safeRoute(url: unknown): Href | null {
  if (typeof url !== 'string') return null;
  if (/^\/leads\/\d+$/.test(url)) return url as Href;
  if (url === '/notifications') return '/notifications';
  return null;
}

export function NotificationsBootstrap() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const handledResponse = useRef<string | null>(null);
  const pushOk = isPushSupported();

  // Register this install's push token for the signed-in user; re-register
  // when the OS rotates the token or the app returns to the foreground
  // (picks up a permission the user just enabled in Settings).
  // Skip in Expo Go on Android — addPushTokenListener / getExpoPushToken throw (SDK 53+).
  useEffect(() => {
    if (!userId || Platform.OS === 'web' || !pushOk) return;
    void registerForPushNotifications();

    const tokenSub = Notifications.addPushTokenListener(() => {
      void registerForPushNotifications();
    });
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerForPushNotifications();
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      }
    });
    return () => {
      tokenSub.remove();
      appSub.remove();
    };
  }, [userId, queryClient, pushOk]);

  // Still refresh inbox when returning to foreground without push APIs.
  useEffect(() => {
    if (!userId || Platform.OS === 'web' || pushOk) return;
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      }
    });
    return () => appSub.remove();
  }, [userId, queryClient, pushOk]);

  // Signed out → clear the tray and cached inbox so the next account on this
  // phone never sees (or taps) the previous user's notifications.
  useEffect(() => {
    if (userId) return;
    void clearDeliveredNotifications();
    queryClient.removeQueries({ queryKey: NOTIFICATIONS_KEY });
  }, [userId, queryClient]);

  // Notification arrived while the app is open → refresh inbox + bell count.
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
    return () => sub.remove();
  }, [userId, queryClient]);

  // Tap on a notification (covers cold start too) → open its screen.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse || Platform.OS === 'web') return;
    const { notification, actionIdentifier } = lastResponse;
    const key = `${notification.request.identifier}:${actionIdentifier}`;
    if (handledResponse.current === key) return;
    handledResponse.current = key;
    void Notifications.clearLastNotificationResponseAsync();

    if (!userId) return; // Signed out — login screen stays.
    if (actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const data = notification.request.content.data ?? {};
    const notificationId = data['notificationId'];
    if (typeof notificationId === 'string') {
      void markNotificationRead(notificationId)
        .catch(() => undefined)
        .finally(() => {
          void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        });
    }

    const route = safeRoute(data['url']) ?? '/notifications';
    router.push(route);
  }, [lastResponse, userId, router, queryClient]);

  // Keep the launcher badge in sync with the unread count.
  const unread = useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: fetchUnreadCount,
    enabled: !!userId,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    if (Platform.OS === 'web' || unread.data == null) return;
    void Notifications.setBadgeCountAsync(unread.data).catch(() => undefined);
  }, [unread.data]);

  return null;
}
