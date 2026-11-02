import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'sf_mobile_access_token',
  refreshToken: 'sf_mobile_refresh_token',
  accountId: 'sf_mobile_account_id',
  userJson: 'sf_mobile_user_json',
  deviceId: 'sf_mobile_device_id',
  accountsJson: 'sf_mobile_accounts_v1',
  rememberEmail: 'sf_mobile_remember_email',
} as const;

/**
 * Keystore reads are slow and the API client reads the token + device id on
 * every request. All writes go through this module, so a memory mirror is safe.
 */
const cache = new Map<string, string | null>();

async function setItem(key: string, value: string) {
  cache.set(key, value);
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function getItem(key: string) {
  if (cache.has(key)) return cache.get(key) ?? null;
  const value = await SecureStore.getItemAsync(key);
  // A write that landed during the read wins.
  if (!cache.has(key)) cache.set(key, value);
  return cache.get(key) ?? null;
}

async function deleteItem(key: string) {
  cache.set(key, null);
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  async saveSession(input: {
    accessToken: string;
    refreshToken: string;
    accountId: string;
    userJson: string;
  }) {
    await Promise.all([
      setItem(KEYS.accessToken, input.accessToken),
      setItem(KEYS.refreshToken, input.refreshToken),
      setItem(KEYS.accountId, input.accountId),
      setItem(KEYS.userJson, input.userJson),
    ]);
  },

  async updateTokens(accessToken: string, refreshToken?: string | null) {
    await setItem(KEYS.accessToken, accessToken);
    if (refreshToken) {
      await setItem(KEYS.refreshToken, refreshToken);
    }
  },

  getAccessToken: () => getItem(KEYS.accessToken),
  getRefreshToken: () => getItem(KEYS.refreshToken),
  getAccountId: () => getItem(KEYS.accountId),
  getUserJson: () => getItem(KEYS.userJson),

  async getDeviceId() {
    const existing = await getItem(KEYS.deviceId);
    if (existing) return existing;
    const id = `mbl_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 14)}`;
    const padded = id.padEnd(16, '0').slice(0, 128);
    await setItem(KEYS.deviceId, padded);
    return padded;
  },

  async clearSession() {
    await Promise.all([
      deleteItem(KEYS.accessToken),
      deleteItem(KEYS.refreshToken),
      deleteItem(KEYS.accountId),
      deleteItem(KEYS.userJson),
    ]);
  },

  getAccountsJson: () => getItem(KEYS.accountsJson),
  setAccountsJson: (value: string) => setItem(KEYS.accountsJson, value),

  getRememberEmail: () => getItem(KEYS.rememberEmail),
  async setRememberEmail(email: string | null) {
    if (!email) {
      await deleteItem(KEYS.rememberEmail);
      return;
    }
    await setItem(KEYS.rememberEmail, email);
  },
};
