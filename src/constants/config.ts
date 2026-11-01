import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

/** Android emulator loopback to host machine. */
const ANDROID_EMULATOR_API = 'http://10.0.2.2:6001/api';
/** Web / iOS simulator / desktop preview. */
const LOCALHOST_API = 'http://localhost:6001/api';

function defaultApiUrl() {
  if (Platform.OS === 'web') return LOCALHOST_API;
  if (Platform.OS === 'android') return ANDROID_EMULATOR_API;
  return LOCALHOST_API;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? extra?.apiUrl ?? defaultApiUrl();

export const APP_NAME = 'Realist CRM';
export const APP_VERSION = '1.0.0';
