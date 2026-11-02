import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './colors';
import {
  loadThemeMode,
  saveThemeMode,
  type ThemeMode,
} from './themePreference';

export type ResolvedScheme = 'light' | 'dark';

type ThemeContextValue = {
  /** User preference: light, dark, or follow system. */
  mode: ThemeMode;
  /** Effective scheme after resolving system. */
  resolved: ResolvedScheme;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  /** False until preference is read from storage. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadThemeMode().then((stored) => {
      if (cancelled) return;
      setModeState(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: ResolvedScheme =
    mode === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : mode;

  const colors = resolved === 'dark' ? darkColors : lightColors;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void saveThemeMode(next);
  }, []);

  const value = useMemo(
    () => ({ mode, resolved, colors, setMode, ready }),
    [mode, resolved, colors, setMode, ready]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Theme colors only — convenience for style factories. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
