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

export async function forgotPasswordRequest(identifier: string) {
  const { data } = await api.post<ApiResponse<{ message?: string } | null>>(
    '/auth/forgot-password',
    { identifier: identifier.trim() }
  );
  return data;
}

export async function resetPasswordRequest(input: {
  identifier: string;
  otp: string;
  password: string;
}) {
  const { data } = await api.post<ApiResponse<null>>('/auth/reset-password', {
    identifier: input.identifier.trim(),
    otp: input.otp.trim(),
    password: input.password,
  });
  return data;
}

type ProfileUpdatePayload = {
  name?: string;
  phone?: string | null;
};

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  isActive?: boolean;
  is_active?: boolean;
  lastLogin?: string | null;
  last_login?: string | null;
  profilePhoto?: string | null;
  profile?: { url?: string | null } | null;
  designationId?: string | null;
  designation?: AuthUser['designation'];
};

/** Login, refresh, and /users/me do not share one field shape. */
export function mapAuthUser(row: ProfileRow): AuthUser {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    role: row.role || 'AGENT',
    is_active: row.is_active ?? row.isActive,
    last_login: row.last_login ?? row.lastLogin ?? null,
    profilePhoto: row.profilePhoto ?? row.profile?.url ?? null,
    designationId: row.designationId ?? null,
    designation: row.designation ?? null,
  };
}

/** Live account behind the current token — not the copy saved on the phone. */
export async function fetchMyProfile() {
  const { data } = await api.get<ApiResponse<ProfileRow>>('/users/me');
  return mapAuthUser(data.data);
}

/** PATCH /users/me — name / phone (Hisab-style personal info). */
export async function updateProfileRequest(input: ProfileUpdatePayload) {
  const { data } = await api.patch<ApiResponse<ProfileRow>>('/users/me', input);
  return mapAuthUser(data.data);
}
