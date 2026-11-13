import { useCallback, useEffect, useState } from 'react';
import { AppState, PermissionsAndroid, Platform, type Permission } from 'react-native';

import {
  getCallLeadPromptConfig,
  isCallLeadPromptAvailable,
  setCallLeadPromptConfig,
  type CallLeadPromptConfig,
} from 'android-call-log';

// PermissionsAndroid is undefined on web: read it only inside Android paths.
const perms = () => PermissionsAndroid.PERMISSIONS;

/** Without these the phone cannot tell us who is calling, or show the prompt. */
function requiredPermissions(): Permission[] {
  const P = perms();
  const list: Permission[] = [P.READ_PHONE_STATE, P.READ_CALL_LOG];
  if (Number(Platform.Version) >= 33) list.push(P.POST_NOTIFICATIONS);
  return list;
}

export type CallLeadPermissions = {
  /** Phone state + call log + notifications. */
  required: boolean;
  contacts: boolean;
};

export async function checkCallLeadPermissions(): Promise<CallLeadPermissions> {
  if (Platform.OS !== 'android') return { required: false, contacts: false };
  const required = await Promise.all(
    requiredPermissions().map((p) => PermissionsAndroid.check(p))
  );
  return {
    required: required.every(Boolean),
    contacts: await PermissionsAndroid.check(perms().READ_CONTACTS),
  };
}

/**
 * Asks for what the prompt needs. Contacts is optional: when denied, the
 * prompt still works but also asks about saved contacts.
 */
export async function requestCallLeadPermissions(withContacts: boolean) {
  if (Platform.OS !== 'android') return { required: false, contacts: false };
  const contacts = perms().READ_CONTACTS;
  const wanted = [...requiredPermissions(), ...(withContacts ? [contacts] : [])];
  const result = await PermissionsAndroid.requestMultiple(wanted);
  const ok = (p: Permission) => result[p] === PermissionsAndroid.RESULTS.GRANTED;
  return {
    required: requiredPermissions().every(ok),
    contacts: withContacts ? ok(contacts) : await PermissionsAndroid.check(contacts),
    /** A required permission was "Don't ask again" — only system settings can fix it. */
    blocked: requiredPermissions().some(
      (p) => result[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
    ),
  };
}

export type CallLeadPromptState = {
  available: boolean;
  loading: boolean;
  config: CallLeadPromptConfig | null;
  permissions: CallLeadPermissions;
  /** Turned on, but a permission was revoked since. */
  needsPermission: boolean;
  /** The user has never turned it on or off. */
  undecided: boolean;
};

export function useCallLeadPromptStatus() {
  const available = Platform.OS === 'android' && isCallLeadPromptAvailable();
  const [config, setConfig] = useState<CallLeadPromptConfig | null>(null);
  const [permissions, setPermissions] = useState<CallLeadPermissions>({
    required: false,
    contacts: false,
  });
  const [loading, setLoading] = useState(available);

  const refresh = useCallback(async () => {
    if (!available) return;
    try {
      const [nextConfig, nextPermissions] = await Promise.all([
        getCallLeadPromptConfig(),
        checkCallLeadPermissions(),
      ]);
      // Equal values keep the old object, so screens do not re-render.
      setConfig((current) =>
        JSON.stringify(current) === JSON.stringify(nextConfig) ? current : nextConfig
      );
      setPermissions((current) =>
        current.required === nextPermissions.required &&
        current.contacts === nextPermissions.contacts
          ? current
          : nextPermissions
      );
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => {
    void refresh();
    // Permissions can change in system settings while the app is in the background.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const update = useCallback(
    async (enabled: boolean, skipContacts: boolean) => {
      await setCallLeadPromptConfig(enabled, skipContacts);
      await refresh();
    },
    [refresh]
  );

  const state: CallLeadPromptState = {
    available,
    loading,
    config,
    permissions,
    needsPermission: !!config?.enabled && !permissions.required,
    undecided: available && !!config && config.configuredAtMs === 0,
  };
  return { ...state, refresh, update };
}
