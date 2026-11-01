import type { CallSyncDirection } from './callSyncApi';

/** Android CallLog.Calls.TYPE → CRM direction. */
export function mapAndroidCallType(type: number): CallSyncDirection {
  switch (type) {
    case 1: // INCOMING
      return 'INCOMING';
    case 2: // OUTGOING
      return 'OUTGOING';
    case 3: // MISSED
      return 'MISSED';
    case 5: // REJECTED
      return 'REJECTED';
    default:
      return 'UNKNOWN';
  }
}
