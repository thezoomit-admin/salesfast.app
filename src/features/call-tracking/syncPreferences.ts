import { Platform } from 'react-native';

import { isCallLogModuleAvailable } from 'android-call-log';

const KEY = 'sf_mobile_call_sync_prefs_v1';

export type CallSyncPrefs = {
  /** User completed the setup screen and accepted the privacy notice. */
  consentedAt: string | null;
  /** User wants call sync when the native module is available. */
  enabled: boolean;
  /** Temporary pause without wiping consent. */
  paused: boolean;
  /**
   * Legacy field. Call sync no longer cuts off by enable time; kept for
   * older installs / prefs shape compatibility.
   */
  syncFromAt: string | null;
  lastSyncedAt: string | null;
  updatedAt: string | null;
};

export type CallSyncStatus =
  | 'not_configured'
  | 'configured'
  | 'paused'
  | 'needs_dev_build'
  | 'unavailable_web';

const DEFAULT_PREFS: CallSyncPrefs = {
  consentedAt: null,
  enabled: false,
  paused: false,
  syncFromAt: null,
  lastSyncedAt: null,
  updatedAt: null,
};

async function getJson(): Promise<CallSyncPrefs> {
  try {
    if (Platform.OS === 'web') {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
      if (!raw) return { ...DEFAULT_PREFS };
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

async function setJson(prefs: CallSyncPrefs) {
  const value = JSON.stringify(prefs);
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // ignore
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(KEY, value);
}

export async function loadCallSyncPrefs(): Promise<CallSyncPrefs> {
  return getJson();
}

export async function saveCallSyncPrefs(
  patch: Partial<CallSyncPrefs>
): Promise<CallSyncPrefs> {
  const current = await getJson();
  const next: CallSyncPrefs = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await setJson(next);
  return next;
}

export function resolveCallSyncStatus(prefs: CallSyncPrefs): {
  status: CallSyncStatus;
  label: string;
  message: string;
  canAutoSync: boolean;
} {
  if (Platform.OS === 'web') {
    if (prefs.consentedAt && prefs.enabled && !prefs.paused) {
      return {
        status: 'unavailable_web',
        label: 'configured (Android only)',
        message:
          'Preference saved. Automatic call-log sync runs on the Android app.',
        canAutoSync: false,
      };
    }
    return {
      status: 'not_configured',
      label: 'not configured',
      message:
        'Set up call sync preferences. Automatic sync requires the Android app.',
      canAutoSync: false,
    };
  }

  if (!prefs.consentedAt || !prefs.enabled) {
    return {
      status: 'not_configured',
      label: 'not configured',
      message:
        'Complete call sync setup to match CRM lead calls. Only matched calls are uploaded — never personal history.',
      canAutoSync: false,
    };
  }

  if (prefs.paused) {
    return {
      status: 'paused',
      label: 'paused',
      message:
        'Call sync is paused. Resume anytime. Manual dialing from lead details still works.',
      canAutoSync: false,
    };
  }

  if (!isCallLogModuleAvailable()) {
    return {
      status: 'needs_dev_build',
      label: 'needs Android build',
      message:
        'Consent is saved, but Expo Go cannot read call logs. Install the Realist CRM development build to sync automatically.',
      canAutoSync: false,
    };
  }

  return {
    status: 'configured',
    label: 'active',
    message: prefs.lastSyncedAt
      ? `Call sync is on. Last sync ${new Date(prefs.lastSyncedAt).toLocaleString()}.`
      : 'Call sync is on. Matched lead calls upload when you open the app or tap Sync now.',
    canAutoSync: true,
  };
}
