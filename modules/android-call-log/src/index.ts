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
  /** Do not ask about numbers saved in the phone's contacts. */
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
};

type AndroidCallLogNative = {
  getRecentCalls(limit: number, minDateMs: number): Promise<NativeCallLogRow[]>;
  hasPermission(): Promise<boolean>;
  getCallLeadPromptConfig(): Promise<CallLeadPromptConfig>;
  setCallLeadPromptConfig(enabled: boolean, skipContacts: boolean): Promise<void>;
  setCallLeadSessionActive(active: boolean): Promise<void>;
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

export async function setCallLeadSessionActive(active: boolean) {
  await getNative()?.setCallLeadSessionActive?.(active);
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
