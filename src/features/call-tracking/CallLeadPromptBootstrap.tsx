import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  flushPendingCallLeads,
  getCallCaptureStatus,
  getCallLeadPromptConfig,
  isCallLeadPromptAvailable,
  setCallCaptureCredentials,
  setCallLeadSessionActive,
  setKnownLeadPhoneKeys,
} from 'android-call-log';

import { api } from '@/api/client';
import { API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import { secureStorage } from '@/services/secureStorage';
import type { ApiResponse } from '@/types/api';

import { getCallMatchDirectory } from './callSyncApi';

/** How old the phone's copy of the CRM lead numbers may get. */
const KNOWN_KEYS_MAX_AGE_MS = 10 * 60_000;
/** Renew the call-capture token (valid 30 days) once it has less than this left. */
const TOKEN_RENEW_BEFORE_MS = 7 * 24 * 60 * 60_000;

/**
 * Copies the CRM lead numbers to the phone, so it never asks about a number
 * that is already a lead. `force` right after the user turns the prompt on.
 */
async function refreshKnownLeadPhones(force: boolean) {
  const config = await getCallLeadPromptConfig();
  if (!force && config && Date.now() - config.knownSyncedAtMs < KNOWN_KEYS_MAX_AGE_MS) {
    return;
  }
  const directory = await getCallMatchDirectory({ fresh: force });
  await setKnownLeadPhoneKeys(directory.entries.map((e) => e.phoneKey));
}

/**
 * Gives the phone the narrow token it needs to save a lead from the
 * notification while the app is closed. Tied to this sign-in on the server:
 * signing out or revoking the session stops it.
 */
async function ensureCallCaptureToken(userId: string, force: boolean) {
  const status = await getCallCaptureStatus();
  if (
    !force &&
    status?.userId === userId &&
    status.expiresAtMs - Date.now() > TOKEN_RENEW_BEFORE_MS
  ) {
    return;
  }
  const { data } = await api.post<ApiResponse<{ token: string; expiresAt: string }>>(
    '/crm/mobile/call-capture/token'
  );
  await setCallCaptureCredentials({
    apiUrl: API_BASE_URL,
    token: data.data.token,
    userId,
    expiresAtMs: Date.parse(data.data.expiresAt),
    deviceId: await secureStorage.getDeviceId(),
  });
}

/**
 * Brings the native prompt up to date: token, known lead numbers, and any
 * lead saved from the notification while offline. Every step is best effort.
 */
export async function syncCallLeadPrompt(userId: string, options?: { force?: boolean }) {
  if (Platform.OS !== 'android' || !isCallLeadPromptAvailable()) return;
  const force = !!options?.force;
  const config = await getCallLeadPromptConfig();
  if (!config?.enabled) return;
  await Promise.allSettled([
    // A server without the call-capture route (not deployed yet) fails here;
    // the notification then sends the user to the app to finish.
    ensureCallCaptureToken(userId, force).then(() => flushPendingCallLeads()),
    refreshKnownLeadPhones(force),
  ]);
}

/**
 * Keeps the native "Is this your lead?" prompt in step with the app:
 * it only fires while someone is signed in, never for a number that is
 * already a CRM lead, and saves leads as the signed-in user only.
 */
export function CallLeadPromptBootstrap() {
  const { user, bootstrapping } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (Platform.OS !== 'android' || !isCallLeadPromptAvailable()) return;
    // Until the saved session is read, "no user" does not mean signed out.
    if (bootstrapping) return;
    // Signed out: no prompts, and the stored token is dropped.
    void setCallLeadSessionActive(!!userId, userId);
    if (!userId) return;

    void syncCallLeadPrompt(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncCallLeadPrompt(userId);
    });
    return () => sub.remove();
  }, [userId, bootstrapping]);

  return null;
}
