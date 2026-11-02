import { Platform } from 'react-native';

const KEY = 'sf_mobile_theme_mode_v1';

export type ThemeMode = 'light' | 'dark' | 'system';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    if (Platform.OS === 'web') {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
      if (isThemeMode(raw)) return raw;
      return 'system';
    }
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(KEY);
    if (isThemeMode(raw)) return raw;
    return 'system';
  } catch {
    return 'system';
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, mode);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(KEY, mode);
  } catch {
    // ignore persistence failures — in-memory mode still applies
  }
}

export const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};
