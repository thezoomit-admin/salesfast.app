// In-memory keystore with the same API as src/services/secureStorage.
export const store = new Map();
export const calls = { clearSession: 0 };
const get = async (k) => store.get(k) ?? null;
export const secureStorage = {
  async saveSession({ accessToken, refreshToken, accountId, userJson }) {
    store.set('access', accessToken);
    store.set('refresh', refreshToken);
    store.set('account', accountId);
    store.set('user', userJson);
  },
  async updateTokens(accessToken, refreshToken) {
    store.set('access', accessToken);
    if (refreshToken) store.set('refresh', refreshToken);
  },
  getAccessToken: () => get('access'),
  getRefreshToken: () => get('refresh'),
  getAccountId: () => get('account'),
  getUserJson: () => get('user'),
  getDeviceId: async () => 'mbl_test_device_0001',
  async clearSession() {
    calls.clearSession += 1;
    for (const k of ['access', 'refresh', 'account', 'user']) store.delete(k);
  },
};
