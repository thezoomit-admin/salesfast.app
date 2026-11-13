import { phoneMatchKey } from '@/features/call-tracking/phoneMatch';

type Source = { id: number; name: string };

/**
 * Lead source preselected for a lead captured from a call: "Phone Inquiry"
 * first, then any other phone / hotline source. Null → the user picks one.
 */
export function pickCallLeadSourceId(sources: readonly Source[]): number | null {
  const named = (pattern: RegExp) =>
    sources.find((s) => pattern.test(s.name.trim().toLowerCase()))?.id ?? null;
  return (
    named(/^phone\s*inquir/) ??
    named(/\b(phone|hotline|incoming)\b/) ??
    null
  );
}

/**
 * Idempotency key for one call: opening the same prompt twice, or retrying a
 * save, can never create two leads.
 */
export function callLeadIdempotencyKey(phone: string, ringAtMs: number | null) {
  const key = phoneMatchKey(phone) ?? phone.replace(/\D/g, '');
  return `call-lead:${key}:${ringAtMs ?? 'manual'}`;
}

/** `at` from the deep link (ms since epoch), or null when missing / bad. */
export function parseRingAt(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Name saved when none was typed — same rule as the server's call capture. */
export const UNKNOWN_LEAD_NAME = 'Unknown';

export function callLeadName(raw: string | null | undefined) {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim();
  return name ? name.slice(0, 100) : UNKNOWN_LEAD_NAME;
}
