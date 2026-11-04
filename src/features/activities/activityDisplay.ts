import { NOTE_CHANNELS } from '@/features/leads/addNoteLogic';
import {
  callBody,
  callKind,
  isCallHistoryNote,
  type CallKind,
} from '@/features/leads/leadActivity';

export type ActivityKind =
  | 'call'
  | 'callMissed'
  | 'whatsapp'
  | 'inPerson'
  | 'followUp'
  | 'followUpDone'
  | 'email'
  | 'meeting'
  | 'lost'
  | 'note';

export type ActivityView = {
  kind: ActivityKind;
  label: string;
  /** What the agent wrote, or the call's duration. Null when there is neither. */
  text: string | null;
  hasVoiceNote: boolean;
};

type NoteInput = {
  note?: string | null;
  channel?: { name?: string | null } | null;
};

const CALL_LABEL: Record<CallKind, string> = {
  incoming: 'Incoming call',
  outgoing: 'Outgoing call',
  missed: 'Missed call',
  failed: 'Failed call',
};

/** A `[Tag]` the apps append after the agent's text. `[name](url)` is a clip link. */
const TRAILING_BLOCK_RE = /\n\n\[[^\]\n]+\](?!\()/;
const LEADING_TAG_RE = /^\[([^\]\n]+)\](?!\()\s*/;
const CLIP_LINK_RE = /\[[^\]\n]+\]\(https?:[^)\s]+\)/g;
const SYNC_LINES_RE =
  /\[call-sync:[^\]]+\]|^Synced from mobile$|^EmployeePhone:\s*.+$/gim;

function parseBody(raw: string) {
  const body = raw.split(TRAILING_BLOCK_RE)[0] ?? '';
  const tag = LEADING_TAG_RE.exec(body);
  const rest = tag ? body.slice(tag[0].length) : body;
  const text = rest.replace(CLIP_LINK_RE, '').replace(SYNC_LINES_RE, '').trim();
  return {
    tag: tag?.[1]?.trim() ?? null,
    text: text || null,
    hasVoiceNote: rest.search(CLIP_LINK_RE) >= 0,
  };
}

function tagKind(tag: string | null): Pick<ActivityView, 'kind' | 'label'> {
  if (!tag || /^activity flow$/i.test(tag)) return { kind: 'note', label: 'Note' };
  if (/^next (flow|follow-?up) · completed$/i.test(tag)) {
    return { kind: 'followUpDone', label: 'Follow-up done' };
  }
  if (/^(next (flow|follow-?up)|follow-?up)$/i.test(tag)) {
    return { kind: 'followUp', label: 'Follow-up set' };
  }
  if (/^email$/i.test(tag)) return { kind: 'email', label: 'Email' };
  if (/^meeting/i.test(tag)) return { kind: 'meeting', label: 'Meeting' };
  if (/^lost reason$/i.test(tag)) return { kind: 'lost', label: 'Lost reason' };
  return { kind: 'note', label: tag };
}

function channelKind(name: string): Pick<ActivityView, 'kind' | 'label'> {
  const label = NOTE_CHANNELS.find((c) => c.match.test(name))?.label;
  if (label === 'WhatsApp') return { kind: 'whatsapp', label };
  if (label === 'In person') return { kind: 'inPerson', label };
  return { kind: 'note', label: name };
}

/** Lead notes hold system tags and sync lines; this is what a person should read. */
export function describeActivity(n: NoteInput): ActivityView {
  const raw = (n.note ?? '').trim();
  const { tag, text, hasVoiceNote } = parseBody(raw);

  if (isCallHistoryNote(n)) {
    const call = callBody(raw);
    if (!call.status) {
      return { kind: 'call', label: 'Call', text, hasVoiceNote };
    }
    const type = callKind(raw);
    return {
      kind: type === 'missed' || type === 'failed' ? 'callMissed' : 'call',
      label: CALL_LABEL[type],
      text: call.duration && !/^0\s*s?$/i.test(call.duration) ? call.duration : null,
      hasVoiceNote,
    };
  }

  const channel = n.channel?.name?.trim();
  if (channel) return { ...channelKind(channel), text, hasVoiceNote };
  return { ...tagKind(tag), text, hasVoiceNote };
}
