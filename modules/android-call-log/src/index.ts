import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

export type NativeCallLogRow = {
  id: string;
  number: string;
  type: number;
  dateMs: number;
  durationSec: number;
};

/** Settings of the "Is this your lead?" prompt, stored on the phone. */
export type CallLeadPromptConfig = {
  enabled: boolean;
  /**
   * Optional: do not ask about numbers saved in the phone's contacts.
   * CRM known leads are always skipped either way. Default false.
   */
  skipContacts: boolean;
  /** Someone is signed in; the prompt never fires while signed out. */
  sessionActive: boolean;
  /** When the user last turned the prompt on or off; 0 = never decided. */
  configuredAtMs: number;
  /** CRM lead numbers the phone knows about (no prompt for those). */
  knownCount: number;
  knownSyncedAtMs: number;
  /** Numbers the user marked "Not a lead". */
  ignoredCount: number;
  /** Leads saved from the notification that the server has not confirmed yet. */
  pendingCount: number;
};

/** The narrow token the notification uses to save leads while the app is closed. */
export type CallCaptureStatus = {
  /** Account the stored token belongs to; null = no token. */
  userId: string | null;
  expiresAtMs: number;
};

type AndroidCallLogNative = {
  getRecentCalls(limit: number, minDateMs: number): Promise<NativeCallLogRow[]>;
  hasPermission(): Promise<boolean>;
  getCallLeadPromptConfig(): Promise<CallLeadPromptConfig>;
  setCallLeadPromptConfig(enabled: boolean, skipContacts: boolean): Promise<void>;
  setCallLeadSessionActive(active: boolean, userId: string | null): Promise<void>;
  setCallCaptureCredentials(
    apiUrl: string,
    token: string,
    userId: string,
    expiresAtMs: number,
    deviceId: string | null
  ): Promise<boolean>;
  clearCallCaptureCredentials(): Promise<void>;
  getCallCaptureStatus(): Promise<CallCaptureStatus>;
  flushPendingCallLeads(): Promise<number>;
  setKnownLeadPhoneKeys(keys: string[]): Promise<void>;
  markLeadPhoneKnown(phone: string): Promise<void>;
  ignoreLeadPhone(phone: string): Promise<void>;
  clearIgnoredLeadPhones(): Promise<void>;
};

let cached: AndroidCallLogNative | null | undefined;

function getNative(): AndroidCallLogNative | null {
  if (Platform.OS !== 'android') return null;
  if (cached !== undefined) return cached;
  try {
    cached = requireNativeModule<AndroidCallLogNative>('AndroidCallLog');
  } catch {
    cached = null;
  }
  return cached;
}

export function isCallLogModuleAvailable() {
  return getNative() != null;
}

export async function hasCallLogPermission() {
  const native = getNative();
  if (!native) return false;
  return native.hasPermission();
}

export async function getRecentCalls(limit = 100, minDateMs = 0) {
  const native = getNative();
  if (!native) {
    throw new Error(
      'Call log module unavailable. Install the SalesFast CRM Android development build (Expo Go cannot read call history).'
    );
  }
  return native.getRecentCalls(Math.min(Math.max(limit, 1), 300), minDateMs);
}

// ---- "Is this your lead?" call prompt ----
// These calls do nothing when the native module is missing (web, Expo Go,
// an APK built before the feature), so callers need no platform checks.

export async function getCallLeadPromptConfig(): Promise<CallLeadPromptConfig | null> {
  return (await getNative()?.getCallLeadPromptConfig?.()) ?? null;
}

export async function setCallLeadPromptConfig(enabled: boolean, skipContacts: boolean) {
  await getNative()?.setCallLeadPromptConfig?.(enabled, skipContacts);
}

/** Signed in as `userId`, or signed out. A token of another account is dropped. */
export async function setCallLeadSessionActive(active: boolean, userId: string | null) {
  await getNative()?.setCallLeadSessionActive?.(active, userId);
}

export async function setCallCaptureCredentials(input: {
  apiUrl: string;
  token: string;
  userId: string;
  expiresAtMs: number;
  deviceId: string | null;
}) {
  return (
    (await getNative()?.setCallCaptureCredentials?.(
      input.apiUrl,
      input.token,
      input.userId,
      input.expiresAtMs,
      input.deviceId
    )) ?? false
  );
}

export async function clearCallCaptureCredentials() {
  await getNative()?.clearCallCaptureCredentials?.();
}

export async function getCallCaptureStatus(): Promise<CallCaptureStatus | null> {
  return (await getNative()?.getCallCaptureStatus?.()) ?? null;
}

/** Sends leads that were saved from the notification while offline. */
export async function flushPendingCallLeads() {
  return (await getNative()?.flushPendingCallLeads?.()) ?? 0;
}

export async function setKnownLeadPhoneKeys(keys: string[]) {
  await getNative()?.setKnownLeadPhoneKeys?.(keys);
}

export async function markLeadPhoneKnown(phone: string) {
  await getNative()?.markLeadPhoneKnown?.(phone);
}

export async function ignoreLeadPhone(phone: string) {
  await getNative()?.ignoreLeadPhone?.(phone);
}

export async function clearIgnoredLeadPhones() {
  await getNative()?.clearIgnoredLeadPhones?.();
}

/** False on APKs built before the call prompt existed. */
export function isCallLeadPromptAvailable() {
  return typeof getNative()?.getCallLeadPromptConfig === 'function';
}
