import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { setAuthLostHandler } from '@/api/client';
import { unregisterPushNotifications } from '@/features/notifications/pushRegistration';
import { deletePendingWrites, deleteQueryCache } from '@/lib/queryPersistence';
import { secureStorage } from '@/services/secureStorage';
import type { AuthUser } from '@/types/api';

import {
  loadStoredUser,
  loginRequest,
  logoutRequest,
  registerDeviceRequest,
  type LoginInput,
} from './authApi';
import {
  getSavedAccount,
  listSavedAccounts,
  markAccountSignedOut,
  removeSavedAccount,
  upsertSavedAccount,
  type SavedMobileAccount,
} from './savedAccounts';

type AuthState = {
  user: AuthUser | null;
  bootstrapping: boolean;
  signingIn: boolean;
  switchingAccount: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Keep current tokens on device, clear active session, go to login. */
  prepareAddAccount: () => Promise<void>;
  switchToAccount: (accountId: string) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  getSavedAccounts: () => Promise<SavedMobileAccount[]>;
};

const AuthContext = createContext<AuthState | null>(null);

async function persistActiveTokensToSaved() {
  const [accountId, accessToken, refreshToken, userJson] = await Promise.all([
    secureStorage.getAccountId(),
    secureStorage.getAccessToken(),
    secureStorage.getRefreshToken(),
    secureStorage.getUserJson(),
  ]);
  if (!accountId || !accessToken || !refreshToken || !userJson) return;
  try {
    const user = JSON.parse(userJson) as AuthUser;
    await upsertSavedAccount({ user, accessToken, refreshToken });
  } catch {
    // ignore corrupt local user
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  // The API client clears stored ids before reporting a lost session.
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          secureStorage.getAccessToken(),
          loadStoredUser(),
        ]);
        if (mounted && token && storedUser) {
          setUser(storedUser);
        }
      } finally {
        if (mounted) setBootstrapping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAuthLostHandler(() => {
      void (async () => {
        const accountId = await secureStorage.getAccountId();
        if (accountId) await markAccountSignedOut(accountId);
        // Session is dead (revoked / deactivated) — drop its offline copy.
        deleteQueryCache(userIdRef.current);
        setUser(null);
      })();
    });
    return () => setAuthLostHandler(null);
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    setSigningIn(true);
    try {
      const result = await loginRequest(input);
      await secureStorage.saveSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accountId: result.user.id,
        userJson: JSON.stringify(result.user),
      });
      await upsertSavedAccount({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      setUser(result.user);
      try {
        await registerDeviceRequest();
      } catch {
        // Non-fatal — session already established.
      }
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const accountId = await secureStorage.getAccountId();
    try {
      await unregisterPushNotifications();
      await logoutRequest();
    } finally {
      if (accountId) await markAccountSignedOut(accountId);
      deleteQueryCache(accountId);
      await secureStorage.clearSession();
      setUser(null);
    }
  }, []);

  const prepareAddAccount = useCallback(async () => {
    await persistActiveTokensToSaved();
    try {
      await unregisterPushNotifications();
    } catch {
      // non-fatal
    }
    await secureStorage.clearSession();
    setUser(null);
  }, []);

  const switchToAccount = useCallback(async (accountId: string) => {
    setSwitchingAccount(true);
    try {
      const target = await getSavedAccount(accountId);
      if (!target) {
        throw new Error('Account not found on this device');
      }
      if (target.signedOut || !target.accessToken || !target.refreshToken) {
        throw new Error('This account needs to sign in again');
      }

      // Keep current session tokens on the saved list before swapping.
      await persistActiveTokensToSaved();

      const nextUser: AuthUser = {
        id: target.id,
        name: target.name,
        email: target.email,
        phone: target.phone,
        role: target.role || 'AGENT',
      };

      await secureStorage.saveSession({
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
        accountId: target.id,
        userJson: JSON.stringify(nextUser),
      });
      await upsertSavedAccount({
        user: nextUser,
        accessToken: target.accessToken,
        refreshToken: target.refreshToken,
      });
      setUser(nextUser);

      try {
        await registerDeviceRequest();
      } catch {
        // Non-fatal
      }
    } finally {
      setSwitchingAccount(false);
    }
  }, []);

  const removeAccount = useCallback(
    async (accountId: string) => {
      const activeId = await secureStorage.getAccountId();
      await removeSavedAccount(accountId);
      deleteQueryCache(accountId);
      // Unsent offline writes belong to the account — gone with it.
      deletePendingWrites(accountId);
      if (activeId === accountId) {
        await signOut();
      }
    },
    [signOut]
  );

  const getSavedAccounts = useCallback(() => listSavedAccounts(), []);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      signingIn,
      switchingAccount,
      signIn,
      signOut,
      prepareAddAccount,
      switchToAccount,
      removeAccount,
      getSavedAccounts,
    }),
    [
      user,
      bootstrapping,
      signingIn,
      switchingAccount,
      signIn,
      signOut,
      prepareAddAccount,
      switchToAccount,
      removeAccount,
      getSavedAccounts,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
