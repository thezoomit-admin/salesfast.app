import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import {
  getCallLeadPromptConfig,
  isCallLeadPromptAvailable,
  setCallLeadSessionActive,
  setKnownLeadPhoneKeys,
} from 'android-call-log';

import { useAuth } from '@/features/auth/AuthContext';

import { getCallMatchDirectory } from './callSyncApi';

/** How old the phone's copy of the CRM lead numbers may get. */
const KNOWN_KEYS_MAX_AGE_MS = 10 * 60_000;

/**
 * Keeps the native "Is this your lead?" prompt in step with the app:
 * it only fires while someone is signed in, and never for a number that is
 * already a CRM lead (the match directory, refreshed while the app is open).
 */
export function CallLeadPromptBootstrap() {
  const { user, bootstrapping } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'android' || !isCallLeadPromptAvailable()) return;
    // Until the saved session is read, "no user" does not mean signed out.
    if (bootstrapping) return;
    void setCallLeadSessionActive(!!user);
    if (!user) return;

    let cancelled = false;
    const refreshKnownLeads = async () => {
      try {
        const config = await getCallLeadPromptConfig();
        if (!config?.enabled) return;
        if (Date.now() - config.knownSyncedAtMs < KNOWN_KEYS_MAX_AGE_MS) return;
        const directory = await getCallMatchDirectory();
        if (cancelled) return;
        await setKnownLeadPhoneKeys(directory.entries.map((e) => e.phoneKey));
      } catch {
        // Offline: the old list stays. The capture screen re-checks the number.
      }
    };

    void refreshKnownLeads();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshKnownLeads();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [user, bootstrapping]);

  return null;
}
