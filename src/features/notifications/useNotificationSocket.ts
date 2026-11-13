import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { api } from '@/api/client';
import { API_BASE_URL } from '@/constants/config';
import { secureStorage } from '@/services/secureStorage';

import { NOTIFICATIONS_KEY } from './notificationsApi';

/** Socket.IO lives on the API host, outside `/api`. */
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const MAX_AUTH_RETRY_MS = 60_000;

/**
 * Live inbox while the app is in the foreground: a new, read or resolved
 * notification on any device refreshes the inbox and badge at once instead of
 * waiting for the next poll. Pop-ups stay with the OS push (a socket banner
 * would double the heads-up the push already shows). In the background the
 * socket is closed and push takes over.
 */
export function useNotificationSocket(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    let socket: Socket | null = null;
    let authRetry: ReturnType<typeof setTimeout> | null = null;
    let authDelay = 2_000;
    let disposed = false;

    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

    const connect = () => {
      if (disposed || socket) return;
      socket = io(SOCKET_URL, {
        path: '/socket.io',
        // Read on every (re)connect: the access token rotates on refresh.
        auth: (cb) => {
          void secureStorage
            .getAccessToken()
            .catch(() => null)
            .then((token) => cb({ token: token ?? '' }));
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
      });

      socket.on('connect', () => {
        authDelay = 2_000;
        // Anything missed while disconnected: the server is the source of truth.
        refresh();
      });
      socket.on('notification:new', refresh);
      socket.on('notification:read', refresh);
      socket.on('notification:read-all', refresh);
      socket.on('notification:updated', refresh);

      socket.on('connect_error', (err: Error) => {
        if (err.message !== 'Unauthorized') return; // network: auto-retries
        // The server refused the token (expired access token). Socket.IO
        // does not retry a refused handshake, so let the API client refresh
        // the session, then try again with backoff.
        if (authRetry) return;
        authRetry = setTimeout(() => {
          authRetry = null;
          void api
            .get('/notifications/unread-count')
            .catch(() => undefined)
            .finally(() => {
              if (!disposed && socket && !socket.connected) socket.connect();
            });
        }, authDelay);
        authDelay = Math.min(authDelay * 2, MAX_AUTH_RETRY_MS);
      });
    };

    const disconnect = () => {
      if (authRetry) clearTimeout(authRetry);
      authRetry = null;
      socket?.removeAllListeners();
      socket?.disconnect();
      socket = null;
    };

    if (AppState.currentState === 'active') connect();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') connect();
      else if (state === 'background') disconnect();
    });

    return () => {
      disposed = true;
      sub.remove();
      disconnect();
    };
  }, [userId, queryClient]);
}
