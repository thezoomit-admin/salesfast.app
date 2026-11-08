import { format } from 'date-fns/format';

import type { LeadPriority, LeadStatus } from '@/types/api';

export type PipelineStatusOption = Pick<
  LeadStatus,
  | 'id'
  | 'name'
  | 'sortOrder'
  | 'isWonStage'
  | 'isLostStage'
  | 'hasRating'
  | 'stageOptions'
>;

const BOTH = '__both__';

export const NOTE_CHANNELS = [
  { label: 'Call', match: /^(call|phone)/i },
  { label: 'WhatsApp', match: /whats\s*app/i },
  { label: 'In person', match: /in[\s-]*person/i },
] as const;

export function isColdCalling(s?: PipelineStatusOption | null) {
  return !!s && /cold\s*call/i.test(String(s.name ?? ''));
}

export function isVisitInterest(s?: PipelineStatusOption | null) {
  return !!s && /site\s*visit/i.test(String(s.name ?? ''));
}

export function isVisited(s?: PipelineStatusOption | null) {
  return !!s && /^visited$/i.test(String(s.name ?? '').trim());
}

export function isWonStageName(s?: PipelineStatusOption | null) {
  return (
    !!s &&
    (!!s.isWonStage || /^(won|booked\/won)$/i.test(String(s.name ?? '').trim()))
  );
}

export function isLostStageName(s?: PipelineStatusOption | null) {
  return (
    !!s && (!!s.isLostStage || /^lost$/i.test(String(s.name ?? '').trim()))
  );
}

export function stageNeedsRating(s?: PipelineStatusOption | null) {
  return !!s?.hasRating;
}

export function stageOptionsOf(s?: PipelineStatusOption | null) {
  return s?.stageOptions ?? [];
}

export function joinStageOption(picked: string[], options: string[]) {
  return options.filter((o) => picked.includes(o)).join(' + ') || undefined;
}

export function sortByOrder(list: PipelineStatusOption[]) {
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Same stage choices as web AddNoteModal. */
export function stageChoicesOf(
  statuses: PipelineStatusOption[],
  currentId: number | null | undefined
) {
  const sorted = sortByOrder(statuses);
  const current = sorted.find((s) => s.id === currentId);
  const coldCalling = sorted.find(isColdCalling);
  const beforeCalling =
    !!coldCalling &&
    (!current || (current.sortOrder ?? 0) < (coldCalling.sortOrder ?? 0));

  if (beforeCalling) {
    return {
      choices: sorted.filter(
        (s) => (s.sortOrder ?? 0) >= (coldCalling!.sortOrder ?? 0)
      ),
      coldCalling: coldCalling!,
    };
  }
  return {
    choices: sorted.filter(
      (s) =>
        s.id !== currentId &&
        (current?.sortOrder == null ||
          (s.sortOrder ?? 0) >= current.sortOrder)
    ),
    coldCalling: null as PipelineStatusOption | null,
  };
}

export function serializeActivityFlow(
  steps: { title: string; detail: string; lines?: string[] }[]
) {
  if (!steps.length) return '';
  const out: string[] = [];
  for (const s of steps) {
    out.push(`${s.title.trim()} · ${s.detail.trim()}`);
    for (const line of s.lines ?? []) {
      const t = line.trim();
      if (t) out.push(`« ${t}`);
    }
  }
  return `[Activity Flow]\n${out.join('\n')}`;
}

export function buildStatusPayload(args: {
  leadStatusId: number;
  currentStatusId?: number | null;
  contactId?: number | null;
  version?: number;
  stageRating?: LeadPriority | null;
  stageOption?: string;
  statusNote?: string;
  statusChannelId?: number | null;
  isWon?: boolean;
  isLost?: boolean;
}): Record<string, unknown> | null {
  if (
    args.leadStatusId == null ||
    args.leadStatusId === args.currentStatusId
  ) {
    return null;
  }
  const payload: Record<string, unknown> = {
    leadStatusId: args.leadStatusId,
    statusContactId: args.contactId ?? null,
  };
  if (args.isWon || args.isLost) payload.nextFollowupDate = null;
  if (args.stageRating) payload.stageRating = args.stageRating;
  if (args.stageOption) payload.stageOption = args.stageOption;
  if (args.statusNote) payload.statusNote = args.statusNote;
  if (args.statusChannelId != null) {
    payload.statusChannelId = args.statusChannelId;
  }
  if (args.version != null) payload.expectedVersion = args.version;
  return payload;
}

export function followupTypeOf(
  target: PipelineStatusOption | null,
  stageOption?: string
) {
  if (!isVisitInterest(target)) return 'FOLLOWUP' as const;
  if (
    stageOption &&
    /office/i.test(stageOption) &&
    !/project|site/i.test(stageOption)
  ) {
    return 'OFFICE_VISIT' as const;
  }
  return 'SITE_VISIT' as const;
}

export function formatFollowupDisplay(d: Date) {
  return format(d, 'dd MMM, hh:mm a');
}

export function formatFollowupDateOnly(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export { BOTH };
