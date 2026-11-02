import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/constants/config';
import { upsertSavedAccount } from '@/features/auth/savedAccounts';
import { secureStorage } from '@/services/secureStorage';
import type { ApiResponse, MobileRefreshResult } from '@/types/api';

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
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
  const [token, deviceId] = await Promise.all([
    secureStorage.getAccessToken(),
    secureStorage.getDeviceId(),
  ]);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Device-Id'] = deviceId;
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  const [accountId, refreshToken, deviceId] = await Promise.all([
    secureStorage.getAccountId(),
    secureStorage.getRefreshToken(),
    secureStorage.getDeviceId(),
  ]);
  if (!accountId || !refreshToken) return null;

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

  const payload = data.data;
  const nextRefresh = payload.refreshToken ?? refreshToken;
  await secureStorage.updateTokens(payload.accessToken, payload.refreshToken);
  if (payload.user) {
    await secureStorage.saveSession({
      accessToken: payload.accessToken,
      refreshToken: nextRefresh,
      accountId: payload.user.id,
      userJson: JSON.stringify(payload.user),
    });
    await upsertSavedAccount({
      user: payload.user,
      accessToken: payload.accessToken,
      refreshToken: nextRefresh,
    });
  }
  return payload.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
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
        return api(original);
      } catch {
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
      return `Cannot reach API (${API_BASE_URL}). Use your PC Wi‑Fi IP in EXPO_PUBLIC_API_URL — localhost does not work in Expo Go.`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
