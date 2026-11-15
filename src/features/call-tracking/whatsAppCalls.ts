import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';

import {
  getWhatsAppCallConfig,
  getWhatsAppCalls,
  isWhatsAppCallTrackingAvailable,
  setWhatsAppCallConfig,
  type WhatsAppCallConfig,
} from 'android-call-log';

export { newestWhatsAppKey, whatsAppUploadItem } from './whatsAppCallLogic';

/** WhatsApp call sync is switched on for this phone and can see calls. */
export async function isWhatsAppSyncOn() {
  if (Platform.OS !== 'android' || !isWhatsAppCallTrackingAvailable()) return false;
  const config = await getWhatsAppCallConfig();
  return !!config?.syncEnabled;
}

/** Newest WhatsApp call kept on the phone, or null when tracking is off. */
export async function newestWhatsAppCallId() {
  if (!(await isWhatsAppSyncOn())) return null;
  const [row] = await getWhatsAppCalls(1, 0);
  return row?.id ?? 'none';
}

/**
 * WhatsApp shows saved callers by name; their number comes from the phone's
 * contacts, so Contacts permission matters here.
 */
async function hasContactsPermission() {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
}

export async function requestContactsPermission() {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
    title: 'Contacts access',
    message:
      'WhatsApp shows saved callers by name. SalesFast looks the name up in your contacts, on this phone only, to find the number.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export type WhatsAppCallStatus = {
  available: boolean;
  loading: boolean;
  config: WhatsAppCallConfig | null;
  contactsGranted: boolean;
  /** A switch is on but Notification access is missing. */
  needsAccess: boolean;
};

export function useWhatsAppCallStatus() {
  const available = Platform.OS === 'android' && isWhatsAppCallTrackingAvailable();
  const [config, setConfig] = useState<WhatsAppCallConfig | null>(null);
  const [contactsGranted, setContactsGranted] = useState(false);
  const [loading, setLoading] = useState(available);

  const refresh = useCallback(async () => {
    if (!available) return;
    try {
      const [next, contacts] = await Promise.all([
        getWhatsAppCallConfig(),
        hasContactsPermission(),
      ]);
      setConfig((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next
      );
      setContactsGranted(contacts);
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => {
    void refresh();
    // Notification access is granted in system settings, outside the app.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<Pick<WhatsAppCallConfig, 'syncEnabled' | 'promptEnabled' | 'trackWhatsApp' | 'trackBusiness'>>) => {
      const current = (await getWhatsAppCallConfig()) ?? config;
      await setWhatsAppCallConfig({
        syncEnabled: patch.syncEnabled ?? current?.syncEnabled ?? false,
        promptEnabled: patch.promptEnabled ?? current?.promptEnabled ?? false,
        trackWhatsApp: patch.trackWhatsApp ?? current?.trackWhatsApp ?? true,
        trackBusiness: patch.trackBusiness ?? current?.trackBusiness ?? true,
      });
      await refresh();
    },
    [config, refresh]
  );

  const anyOn = !!config?.syncEnabled || !!config?.promptEnabled;
  const status: WhatsAppCallStatus = {
    available,
    loading,
    config,
    contactsGranted,
    needsAccess: anyOn && !config?.accessGranted,
  };
  return { ...status, refresh, update };
}
