import * as SecureStore from 'expo-secure-store';

const KEYS = {
  accessToken: 'sf_mobile_access_token',
  refreshToken: 'sf_mobile_refresh_token',
  accountId: 'sf_mobile_account_id',
  userJson: 'sf_mobile_user_json',
  deviceId: 'sf_mobile_device_id',
} as const;

async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
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
};
