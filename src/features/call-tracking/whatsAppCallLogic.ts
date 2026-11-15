import type { CallSyncUploadItem } from './callSyncApi';

/** One finished WhatsApp call as the phone keeps it (see android-call-log). */
export type WhatsAppCallRow = {
  id: string;
  app: string;
  number: string;
  direction: string;
  dateMs: number;
  durationSec: number;
};

const DIRECTIONS = new Set(['INCOMING', 'OUTGOING', 'MISSED', 'UNKNOWN']);

/**
 * The upload for a WhatsApp call. `whatsapp:` keeps its id apart from
 * phone-line ids (`android:`), so the server never mixes the two.
 */
export function whatsAppUploadItem(row: WhatsAppCallRow): CallSyncUploadItem {
  const direction = DIRECTIONS.has(row.direction)
    ? (row.direction as CallSyncUploadItem['direction'])
    : 'UNKNOWN';
  return {
    deviceCallId: `whatsapp:${row.id}`.slice(0, 200),
    phone: row.number,
    direction,
    startedAt: new Date(row.dateMs).toISOString(),
    durationSec: Math.min(86_400, Math.max(0, Math.round(Number(row.durationSec) || 0))),
    channel: 'WHATSAPP',
  };
}

/** A key that changes whenever a new WhatsApp call is kept on the phone. */
export function newestWhatsAppKey(rows: readonly Pick<WhatsAppCallRow, 'id'>[]) {
  return rows[0]?.id ?? 'none';
}

/** Where a call-lead prompt came from (the notification's `channel` link param). */
export type CallLeadChannel = 'phone' | 'whatsapp';

export function parseCallLeadChannel(raw: string | string[] | undefined): CallLeadChannel {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim().toLowerCase() === 'whatsapp' ? 'whatsapp' : 'phone';
}
