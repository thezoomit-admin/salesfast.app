import { Platform } from 'react-native';

const KEY = 'sf_mobile_call_sync_prefs_v1';

export type CallSyncPrefs = {
  /** User completed the setup screen and accepted the privacy notice. */
  consentedAt: string | null;
  /** User wants call sync when the native module is available. */
  enabled: boolean;
  /** Temporary pause without wiping consent. */
  paused: boolean;
  updatedAt: string | null;
};

export type CallSyncStatus =
  | 'not_configured'
  | 'configured'
  | 'paused'
  | 'unavailable_web';

const DEFAULT_PREFS: CallSyncPrefs = {
  consentedAt: null,
  enabled: false,
  paused: false,
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
          'Preference saved. Automatic call-log sync runs on the Android app after Phase 0. Manual dialing works here.',
        canAutoSync: false,
      };
    }
    return {
      status: 'not_configured',
      label: 'not configured',
      message:
        'Set up call sync preferences. Automatic sync requires the Android app; web can only save your preference.',
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

  return {
    status: 'configured',
    label: 'configured',
    message:
      'Call sync preference is on. Automatic call-log reading activates after the Phase 0 device spike passes. Manual dialing is available now.',
    canAutoSync: false,
  };
}
