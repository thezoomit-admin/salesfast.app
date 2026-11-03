import type { LeadDetail, LeadNote, LeadStatusHistoryEntry } from '@/types/api';

const CALL_SYNC_MARKER_RE = /\[call-sync:[^\]]+\]/i;

/** Call-channel / mobile-sync notes belong in Call History only (web parity). */
export function isCallHistoryNote(n: {
  note?: string | null;
  channel?: { name?: string | null } | null;
}) {
  const channel = (n.channel?.name || '').trim().toLowerCase();
  if (channel === 'call' || channel.includes('call')) return true;
  const text = (n.note || '').trim();
  if (/^\[call\]/i.test(text)) return true;
  if (CALL_SYNC_MARKER_RE.test(text)) return true;
  return false;
}

export function isSystemActor(name?: string | null) {
  const n = String(name ?? '').trim();
  if (!n) return true;
  return /^system$/i.test(n);
}

const FLOW_DONE_RE = /^\[Next (?:Flow|Follow-?up) · Completed\]\s*/i;
const FLOW_SET_RE = /^\[Next (?:Flow|Follow-?up)\]\s*/i;
const FOLLOWUP_RE = /^\[Follow-?up\]\s*/i;

/** System Next Follow-up history rows — not a real agent touchpoint. */
export function isSystemFlowNote(note?: string | null) {
  const t = (note ?? '').trim();
  return FLOW_DONE_RE.test(t) || FLOW_SET_RE.test(t) || FOLLOWUP_RE.test(t);
}

/**
 * Newest real touchpoint (web FollowupCard parity): user note, past meeting,
 * or user status change. Falls back to list `lastContactDate` when present.
 */
export function resolveLastContactAt(lead: LeadDetail): string | null {
  const now = Date.now();
  const stamps: string[] = [];

  for (const n of lead.notes ?? []) {
    if (!n.createdAt || isSystemFlowNote(n.note)) continue;
    stamps.push(n.createdAt);
  }

  for (const raw of lead.meetings ?? []) {
    const m = raw as {
      status?: string | null;
      startsAt?: string | null;
    };
    if (!m.startsAt || m.status === 'CANCELLED') continue;
    const t = Date.parse(m.startsAt);
    if (!Number.isFinite(t) || t > now) continue;
    stamps.push(m.startsAt);
  }

  for (const h of lead.statusHistory ?? []) {
    if (!h.changedAt || isSystemActor(h.changedByName)) continue;
    stamps.push(h.changedAt);
  }

  if (lead.lastContactDate) stamps.push(lead.lastContactDate);

  let latest: string | null = null;
  let latestMs = -Infinity;
  for (const at of stamps) {
    const ms = Date.parse(at);
    if (!Number.isFinite(ms)) continue;
    if (ms > latestMs) {
      latestMs = ms;
      latest = at;
    }
  }
  return latest;
}

export type HistoryEvent = {
  key: string;
  kind: 'status' | 'note';
  title: string;
  body?: string | null;
  by?: string | null;
  date: string;
  meta?: string | null;
};

function stageLabel(h: LeadStatusHistoryEntry) {
  const base = h.toStatusName || 'Status';
  const bits = [h.stageRating, h.stageOption].filter(Boolean);
  return bits.length ? `${base} · ${bits.join(' · ')}` : base;
}

/** Newest-first History feed (status changes + non-call notes). */
export function buildHistoryEvents(lead: LeadDetail): HistoryEvent[] {
  const statusEvents: HistoryEvent[] = (lead.statusHistory ?? [])
    .filter((h) => !isSystemActor(h.changedByName))
    .map((h) => ({
      key: `status-${h.id}`,
      kind: 'status' as const,
      title: 'Status Changed',
      body: h.note,
      by: h.changedByName,
      date: h.changedAt,
      meta: [h.fromStatusName, stageLabel(h)].filter(Boolean).join(' → '),
    }));

  const noteEvents: HistoryEvent[] = (lead.notes ?? [])
    .filter((n) => !/^\[Status Change\]/i.test(n.note ?? ''))
    .filter((n) => !isCallHistoryNote(n))
    .map((n) => ({
      key: `note-${n.id}`,
      kind: 'note' as const,
      title: n.channel?.name ? `${n.channel.name}` : 'Note Added',
      body: n.note,
      by: n.addedByName,
      date: n.createdAt,
      meta: n.followupDate ? `Follow-up ${n.followupDate}` : null,
    }));

  return [...statusEvents, ...noteEvents]
    .filter((e) => !!e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export type CallKind = 'incoming' | 'outgoing' | 'missed' | 'failed';

const SHORT_OUTGOING_FAILED_SEC = 12;

function parseDurationSec(duration?: string | null): number | null {
  if (!duration) return null;
  const s = duration.trim().toLowerCase();
  if (s === '0' || s === '0s') return 0;
  const minSec = /^(\d+)\s*m(?:\s*(\d+)\s*s)?$/.exec(s);
  if (minSec) {
    return parseInt(minSec[1]!, 10) * 60 + parseInt(minSec[2] || '0', 10);
  }
  const secOnly = /^(\d+)\s*s$/.exec(s);
  if (secOnly) return parseInt(secOnly[1]!, 10);
  return null;
}

export function callBody(note?: string | null) {
  const raw = (note ?? '').trim();
  const withoutMarker = raw.replace(CALL_SYNC_MARKER_RE, '').trim();
  const withoutPrefix = withoutMarker
    .replace(/^EmployeePhone:\s*.+$/im, '')
    .replace(/^\[Call\]\s*/i, '')
    .trim();
  const lines = withoutPrefix
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { headline: '—', status: null as string | null, duration: null as string | null };
  }

  const headline = lines[0]!;
  const parts = headline.split(/\s*[·•]\s*/);
  if (
    parts.length >= 2 &&
    /^(incoming|outgoing|missed|rejected|failed)$/i.test(parts[0]!)
  ) {
    return {
      headline,
      status: parts[0]!,
      duration: parts.slice(1).join(' · '),
    };
  }
  return { headline, status: null, duration: null };
}

export function callKind(note?: string | null): CallKind {
  const text = (note ?? '').toLowerCase();
  if (/\bincoming\b/.test(text)) return 'incoming';
  if (/\bmissed\b|\brejected\b/.test(text)) return 'missed';
  const body = callBody(note);
  if (/^failed$/i.test(body.status || '') || /\bfailed\b/.test(text)) {
    return 'failed';
  }
  if (/^outgoing$/i.test(body.status || '') || /\boutgoing\b/.test(text)) {
    const sec = parseDurationSec(body.duration);
    if (sec != null && sec <= SHORT_OUTGOING_FAILED_SEC) return 'failed';
    return 'outgoing';
  }
  return 'outgoing';
}

/** Keep one row per call-sync marker (oldest id wins). */
export function dedupeCallNotes(notes: LeadNote[]): LeadNote[] {
  const seen = new Set<string>();
  const out: LeadNote[] = [];
  const sorted = [...notes].sort((a, b) => a.id - b.id);
  for (const n of sorted) {
    const m = (n.note ?? '').match(CALL_SYNC_MARKER_RE);
    const marker = m?.[0]?.toLowerCase();
    if (marker) {
      if (seen.has(marker)) continue;
      seen.add(marker);
    }
    out.push(n);
  }
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function callNotesOf(lead: LeadDetail): LeadNote[] {
  return dedupeCallNotes((lead.notes ?? []).filter(isCallHistoryNote));
}

export function formatViewDuration(seconds: number) {
  if (!seconds || seconds < 1) return '< 1s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}
