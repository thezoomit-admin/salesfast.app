import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { setAuthLostHandler, setSessionUserHandler } from '@/api/client';
import { unregisterPushNotifications } from '@/features/notifications/pushRegistration';
import { deletePendingWrites, deleteQueryCache } from '@/lib/queryPersistence';
import { secureStorage } from '@/services/secureStorage';
import type { AuthUser } from '@/types/api';

import {
  fetchMyProfile,
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
  /** Merge profile fields into the active user + saved account. */
  updateUser: (next: AuthUser) => Promise<void>;
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
  // Bumped on sign-in / switch / sign-out so a late restore can't put the
  // previous account back on screen.
  const sessionEpoch = useRef(0);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  const applyLiveProfile = useCallback(async (accountId: string) => {
    const epoch = sessionEpoch.current;
    try {
      const me = await fetchMyProfile();
      if (sessionEpoch.current !== epoch || me.id !== accountId) return;
      const active = await secureStorage.getAccountId();
      if (active !== accountId) return;
      const [accessToken, refreshToken] = await Promise.all([
        secureStorage.getAccessToken(),
        secureStorage.getRefreshToken(),
      ]);
      if (!accessToken || !refreshToken) return;
      if ((await secureStorage.getAccountId()) !== accountId) return;
      await secureStorage.saveSession({
        accessToken,
        refreshToken,
        accountId,
        userJson: JSON.stringify(me),
      });
      await upsertSavedAccount({
        user: me,
        accessToken,
        refreshToken,
      });
      if (sessionEpoch.current === epoch) setUser(me);
    } catch {
      // Keep the login snapshot if the profile call fails.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const epoch = sessionEpoch.current;
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          secureStorage.getAccessToken(),
          loadStoredUser(),
        ]);
        if (!mounted || sessionEpoch.current !== epoch) return;
        if (token && storedUser) {
          setUser(storedUser);
          void applyLiveProfile(storedUser.id);
        }
      } finally {
        if (mounted && sessionEpoch.current === epoch) setBootstrapping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applyLiveProfile]);

  useEffect(() => {
    setSessionUserHandler((next) => {
      setUser((current) =>
        current && current.id !== next.id ? current : next
      );
    });
    return () => setSessionUserHandler(null);
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
      sessionEpoch.current += 1;
      const signedIn = result.user;
      await secureStorage.saveSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accountId: signedIn.id,
        userJson: JSON.stringify(signedIn),
      });
      await upsertSavedAccount({
        user: signedIn,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      setUser(signedIn);
      void applyLiveProfile(signedIn.id);
      try {
        await registerDeviceRequest();
      } catch {
        // Non-fatal — session already established.
      }
    } finally {
      setSigningIn(false);
    }
  }, [applyLiveProfile]);

  const signOut = useCallback(async () => {
    sessionEpoch.current += 1;
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
    sessionEpoch.current += 1;
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
      sessionEpoch.current += 1;
      setUser(nextUser);
      void applyLiveProfile(nextUser.id);

      try {
        await registerDeviceRequest();
      } catch {
        // Non-fatal
      }
    } finally {
      setSwitchingAccount(false);
    }
  }, [applyLiveProfile]);

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

  const updateUser = useCallback(async (next: AuthUser) => {
    const [accessToken, refreshToken, accountId] = await Promise.all([
      secureStorage.getAccessToken(),
      secureStorage.getRefreshToken(),
      secureStorage.getAccountId(),
    ]);
    if (accessToken && refreshToken && accountId) {
      await secureStorage.saveSession({
        accessToken,
        refreshToken,
        accountId,
        userJson: JSON.stringify(next),
      });
      await upsertSavedAccount({
        user: next,
        accessToken,
        refreshToken,
      });
    }
    setUser(next);
  }, []);

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
      updateUser,
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
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
