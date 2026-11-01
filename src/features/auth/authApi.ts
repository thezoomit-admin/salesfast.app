import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { APP_VERSION } from '@/constants/config';
import { secureStorage } from '@/services/secureStorage';
import type { ApiResponse, AuthUser, MobileLoginResult } from '@/types/api';

export type LoginInput = {
  email?: string;
  phone?: string;
  password: string;
};

export async function loginRequest(input: LoginInput) {
  const deviceId = await secureStorage.getDeviceId();
  const { data } = await api.post<ApiResponse<MobileLoginResult>>(
    '/auth/mobile/login',
    {
      ...input,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: APP_VERSION,
      osVersion: String(Platform.Version),
      deviceLabel: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} · ${
        Constants.deviceName ?? 'Device'
      }`,
    },
    {
      headers: { 'X-Device-Id': deviceId },
    }
  );
  return data.data;
}

export async function logoutRequest() {
  const [accountId, refreshToken] = await Promise.all([
    secureStorage.getAccountId(),
    secureStorage.getRefreshToken(),
  ]);
  if (!accountId) return;
  try {
    await api.post('/auth/mobile/logout', { accountId, refreshToken });
  } catch {
    // Local clear still proceeds.
  }
}

export async function registerDeviceRequest() {
  await api.post('/auth/mobile/register-device', {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    appVersion: APP_VERSION,
    osVersion: String(Platform.Version),
    deviceLabel: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} · ${
      Constants.deviceName ?? 'Device'
    }`,
  });
}

export async function loadStoredUser(): Promise<AuthUser | null> {
  const json = await secureStorage.getUserJson();
  if (!json) return null;
  try {
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}
