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

/**
 * Loopback or private-LAN API URL. A LAN IP in .env goes stale whenever the PC
 * joins another network or DHCP renews, so treat it like localhost. Public
 * hosts (staging / production) never match.
 */
const LOCAL_API_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(?=[:/]|$)/i;

function isLocalApiUrl(url: string) {
  return LOCAL_API_ORIGIN.test(url);
}

function withLanHost(url: string, lanHost: string) {
  return url.replace(LOCAL_API_ORIGIN, `http://${lanHost}`);
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

  // Backend runs on the same PC as Metro, so follow Metro's current IP. Release
  // builds have no Metro host and keep the configured URL.
  if (Platform.OS !== 'web' && isLocalApiUrl(configured)) {
    const lan = lanHostFromExpo();
    if (lan) return withLanHost(configured, lan);
  }

  return configured;
}

export const API_BASE_URL = resolveApiUrl();

export const APP_NAME = 'Salesfast- CRM';
export const APP_VERSION = '1.0.2';
/** Matches android.versionCode / ios.buildNumber in app.config.ts */
export const APP_BUILD = '5';

/** Dokploy staging API — used by installed APKs. */
export const STAGING_API_URL = 'https://salesfastapi-dev.thezoomit.com/api';

/**
 * Admin contact for agent onboarding (accounts are provisioned, not self-serve).
 * Override via EXPO_PUBLIC_ADMIN_EMAIL / EXPO_PUBLIC_ADMIN_WHATSAPP.
 */
export const ADMIN_CONTACT_EMAIL =
  process.env.EXPO_PUBLIC_ADMIN_EMAIL?.trim() || 'admin@thezoomit.com';
/** Digits only or with country code, e.g. 88017XXXXXXXX */
export const ADMIN_CONTACT_WHATSAPP =
  process.env.EXPO_PUBLIC_ADMIN_WHATSAPP?.trim() || '';


