import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra?.apiUrl ??
  'http://10.0.2.2:6001/api';

export const APP_NAME = 'Realist CRM';
export const APP_VERSION = '1.0.0';
