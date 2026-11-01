/**
 * Web preview storage. Not for production agent devices.
 * Tokens live in localStorage (or memory if storage is blocked).
 */

const KEYS = {
  accessToken: 'sf_mobile_access_token',
  refreshToken: 'sf_mobile_refresh_token',
  accountId: 'sf_mobile_account_id',
  userJson: 'sf_mobile_user_json',
  deviceId: 'sf_mobile_device_id',
} as const;

const memoryStore = new Map<string, string>();

function get(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStore.get(key) ?? null;
}

function set(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // ignore
  }
  memoryStore.set(key, value);
}

function remove(key: string) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

export const secureStorage = {
  async saveSession(input: {
    accessToken: string;
    refreshToken: string;
    accountId: string;
    userJson: string;
  }) {
    set(KEYS.accessToken, input.accessToken);
    set(KEYS.refreshToken, input.refreshToken);
    set(KEYS.accountId, input.accountId);
    set(KEYS.userJson, input.userJson);
  },

  async updateTokens(accessToken: string, refreshToken?: string | null) {
    set(KEYS.accessToken, accessToken);
    if (refreshToken) set(KEYS.refreshToken, refreshToken);
  },

  async getAccessToken() {
    return get(KEYS.accessToken);
  },
  async getRefreshToken() {
    return get(KEYS.refreshToken);
  },
  async getAccountId() {
    return get(KEYS.accountId);
  },
  async getUserJson() {
    return get(KEYS.userJson);
  },

  async getDeviceId() {
    const existing = get(KEYS.deviceId);
    if (existing) return existing;
    const id = `mbl_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 14)}`;
    const padded = id.padEnd(16, '0').slice(0, 128);
    set(KEYS.deviceId, padded);
    return padded;
  },

  async clearSession() {
    remove(KEYS.accessToken);
    remove(KEYS.refreshToken);
    remove(KEYS.accountId);
    remove(KEYS.userJson);
  },
};
