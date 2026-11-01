import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { setAuthLostHandler } from '@/api/client';
import { secureStorage } from '@/services/secureStorage';
import type { AuthUser } from '@/types/api';

import {
  loadStoredUser,
  loginRequest,
  logoutRequest,
  registerDeviceRequest,
  type LoginInput,
} from './authApi';

type AuthState = {
  user: AuthUser | null;
  bootstrapping: boolean;
  signingIn: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

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
    setAuthLostHandler(() => setUser(null));
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
    try {
      await logoutRequest();
    } finally {
      await secureStorage.clearSession();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, bootstrapping, signingIn, signIn, signOut }),
    [user, bootstrapping, signingIn, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
