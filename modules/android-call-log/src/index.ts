import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

export type NativeCallLogRow = {
  id: string;
  number: string;
  type: number;
  dateMs: number;
  durationSec: number;
};

type AndroidCallLogNative = {
  getRecentCalls(limit: number, minDateMs: number): Promise<NativeCallLogRow[]>;
  hasPermission(): Promise<boolean>;
};

let cached: AndroidCallLogNative | null | undefined;

function getNative(): AndroidCallLogNative | null {
  if (Platform.OS !== 'android') return null;
  if (cached !== undefined) return cached;
  try {
    cached = requireNativeModule<AndroidCallLogNative>('AndroidCallLog');
  } catch {
    cached = null;
  }
  return cached;
}

export function isCallLogModuleAvailable() {
  return getNative() != null;
}

export async function hasCallLogPermission() {
  const native = getNative();
  if (!native) return false;
  return native.hasPermission();
}

export async function getRecentCalls(limit = 100, minDateMs = 0) {
  const native = getNative();
  if (!native) {
    throw new Error(
      'Call log module unavailable. Install the SalesFast CRM Android development build (Expo Go cannot read call history).'
    );
  }
  return native.getRecentCalls(Math.min(Math.max(limit, 1), 300), minDateMs);
}
