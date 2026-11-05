import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/constants/config';
import { upsertSavedAccount } from '@/features/auth/savedAccounts';
import { reportReachable, reportUnreachable } from '@/lib/connectivity';
import {
  recordApiRetry,
  recordApiStart,
  recordApiTiming,
  recordAuthRefresh,
} from '@/lib/perfMonitor';
import { secureStorage } from '@/services/secureStorage';
import type { ApiResponse, MobileRefreshResult } from '@/types/api';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Send only while this account is the active one. Queued offline writes
     * use it so a switch of account can never send them with another token.
     */
    accountId?: string;
  }
}

/** The request belongs to an account that is not signed in right now. */
export class AccountChangedError extends Error {
  constructor() {
    super('Signed-in account changed');
    this.name = 'AccountChangedError';
  }
}

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _startedAt?: number;
};

let refreshPromise: Promise<string | null> | null = null;
let onAuthLost: (() => void) | null = null;

export const setAuthLostHandler = (handler: (() => void) | null) => {
  onAuthLost = handler;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const [token, deviceId, activeAccountId] = await Promise.all([
    secureStorage.getAccessToken(),
    secureStorage.getDeviceId(),
    config.accountId ? secureStorage.getAccountId() : null,
  ]);
  // Checked in the same step that attaches the token.
  if (config.accountId && config.accountId !== activeAccountId) {
    throw new AccountChangedError();
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Device-Id'] = deviceId;
  (config as RetriableConfig)._startedAt = Date.now();
  recordApiStart(config.method, config.url);
  return config;
});

function trackResponse(config: RetriableConfig | undefined, status: number | string) {
  if (config?._startedAt) {
    recordApiTiming(config.method, config.url, status, Date.now() - config._startedAt);
  }
}

/**
 * Refreshes the active account's session. The user can switch accounts while
 * the refresh is in flight: the rotated tokens still belong to the account
 * that started it, so they are kept on its saved entry (the old refresh token
 * is retired by rotation) but never installed as the active session, and the
 * request fails with AccountChangedError instead of signing anyone out.
 */
async function refreshAccessToken(): Promise<string | null> {
  const [accountId, refreshToken, deviceId] = await Promise.all([
    secureStorage.getAccountId(),
    secureStorage.getRefreshToken(),
    secureStorage.getDeviceId(),
  ]);
  if (!accountId || !refreshToken) return null;
  const stillActive = async () =>
    (await secureStorage.getAccountId()) === accountId;

  const startedAt = Date.now();
  recordAuthRefresh('start');
  let payload: MobileRefreshResult;
  try {
    const { data } = await axios.post<ApiResponse<MobileRefreshResult>>(
      `${API_BASE_URL}/auth/mobile/refresh`,
      { accountId, refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        timeout: 30_000,
      }
    );
    payload = data.data;
  } catch (error) {
    recordAuthRefresh('failed', Date.now() - startedAt);
    // Another account is active now — its session is not ours to clear.
    if (!(await stillActive())) throw new AccountChangedError();
    throw error;
  }

  const nextRefresh = payload.refreshToken ?? refreshToken;
  const active = await stillActive();
  // No await between the check above and these cache writes.
  if (active && payload.user) {
    await secureStorage.saveSession({
      accessToken: payload.accessToken,
      refreshToken: nextRefresh,
      accountId: payload.user.id,
      userJson: JSON.stringify(payload.user),
    });
  } else if (active) {
    await secureStorage.updateTokens(payload.accessToken, payload.refreshToken);
  }
  if (payload.user) {
    await upsertSavedAccount({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: nextRefresh,
    });
  }
  recordAuthRefresh(active ? 'end' : 'account changed', Date.now() - startedAt);
  if (!active) throw new AccountChangedError();
  return payload.accessToken;
}

api.interceptors.response.use(
  (response) => {
    reportReachable();
    trackResponse(response.config, response.status);
    return response;
  },
  async (error: AxiosError) => {
    // Never sent — says nothing about the network.
    if (error instanceof AccountChangedError) return Promise.reject(error);
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    trackResponse(original, status ?? error.code ?? 'ERR');
    if (error.response) {
      reportReachable();
    } else if (!axios.isCancel(error)) {
      // Never reached the server (no network / DNS / timeout).
      reportUnreachable();
    }
    const url = String(original?.url || '');
    const isAuthCall =
      url.includes('/auth/mobile/login') ||
      url.includes('/auth/mobile/refresh');

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const nextToken = await refreshPromise;
        if (!nextToken) {
          await secureStorage.clearSession();
          onAuthLost?.();
          return Promise.reject(error);
        }
        original.headers.Authorization = `Bearer ${nextToken}`;
        recordApiRetry(original.method, original.url, 'after token refresh');
        return api(original);
      } catch (refreshError) {
        // The request's account was switched away mid-refresh; the account
        // now active is intact.
        if (refreshError instanceof AccountChangedError) {
          return Promise.reject(refreshError);
        }
        await secureStorage.clearSession();
        onAuthLost?.();
        return Promise.reject(error);
      }
    }

    const code = (error.response?.data as { error?: { code?: string } })?.error
      ?.code;
    if (status === 403 && code === 'ACCOUNT_DEACTIVATED') {
      await secureStorage.clearSession();
      onAuthLost?.();
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong'
) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; errorMessages?: string[] }
      | undefined;
    if (data?.message) return data.message;
    if (data?.errorMessages?.length) return data.errorMessages.join(', ');
    if (error.message === 'Network Error') {
      return `Cannot reach API (${API_BASE_URL}). Check that the backend is running and this phone is on the same Wi‑Fi as the PC.`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
