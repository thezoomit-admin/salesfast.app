import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

/** Android emulator → host machine loopback. */
const ANDROID_EMULATOR_API = 'http://10.0.2.2:6001/api';
/** Same-machine browser / iOS simulator. */
const LOCALHOST_API = 'http://localhost:6001/api';

/**
 * Expo Go on a physical phone: Metro host is the PC LAN IP (e.g. 192.168.0.163:8081).
 * localhost / 10.0.2.2 do not work on a real device.
 */
function lanHostFromExpo(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    // Expo Go debugger host: "192.168.0.163:8081"
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig
      ?.debuggerHost,
    (Constants.manifest as { debuggerHost?: string } | null)?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    const host = raw.split(':')[0]?.trim();
    if (
      host &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      host !== '10.0.2.2'
    ) {
      return host;
    }
  }
  return null;
}

function isLoopbackUrl(url: string) {
  return /https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/i.test(url);
}

function withLanHost(url: string, lanHost: string) {
  return url.replace(
    /https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)/i,
    `http://${lanHost}`
  );
}

function defaultApiUrl() {
  if (Platform.OS === 'web') return LOCALHOST_API;
  if (Platform.OS === 'android') {
    // Physical device via Expo Go → LAN; emulator → 10.0.2.2
    const lan = lanHostFromExpo();
    if (lan) return `http://${lan}:6001/api`;
    return ANDROID_EMULATOR_API;
  }
  const lan = lanHostFromExpo();
  if (lan) return `http://${lan}:6001/api`;
  return LOCALHOST_API;
}

function resolveApiUrl() {
  const configured =
    process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl ?? defaultApiUrl();

  // Env often has localhost for web/dev PC — rewrite for Expo Go on phone.
  if (Platform.OS !== 'web' && isLoopbackUrl(configured)) {
    const lan = lanHostFromExpo();
    if (lan) return withLanHost(configured, lan);
  }

  return configured;
}

export const API_BASE_URL = resolveApiUrl();

export const APP_NAME = 'Salesfast- CRM';
export const APP_VERSION = '1.0.0';

/** Dokploy staging API — used by installed APKs. */
export const STAGING_API_URL = 'https://salesfastapi-dev.thezoomit.com/api';

