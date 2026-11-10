import type { IconSvgElement } from '@hugeicons/react-native';

import {
  Calendar03Icon,
  Call02Icon,
  CancelCircleIcon,
  FileEditIcon,
  HandshakeIcon,
  Location01Icon,
  TrophyIcon,
  UserAdd01Icon,
} from '@/components/icons/hugeicons';
import type { LeadStatus } from '@/types/api';

export type PipelineStatus = Pick<
  LeadStatus,
  'id' | 'name' | 'color' | 'isWonStage' | 'isLostStage' | 'hasRating' | 'stageOptions'
>;

export type PipelineStep = {
  key: string;
  label: string;
  icon: IconSvgElement;
  statusIds: number[];
  statuses: PipelineStatus[];
  isTerminal?: boolean;
};

export function shortPipelineLabel(name: string) {
  const n = String(name ?? '').trim();
  if (/^new\/contacted$/i.test(n)) return 'New';
  if (/^qualified\/interested$/i.test(n)) return 'Qualified';
  if (/^cold calling$/i.test(n)) return 'Cold Calling';
  if (/^site visit$/i.test(n)) return 'Site visit';
  if (/^negotiation$/i.test(n)) return 'Negotiation';
  if (/^booked\/won$/i.test(n)) return 'Won';
  if (/^won$/i.test(n)) return 'Won';
  if (/^lost$/i.test(n)) return 'Lost';
  return n.length > 14 ? `${n.slice(0, 12)}…` : n;
}

export function isWonStatus(s?: PipelineStatus | null) {
  return (
    !!s?.isWonStage ||
    /^(won|booked\/won)$/i.test(String(s?.name ?? '').trim())
  );
}

export function isLostStatus(s?: PipelineStatus | null) {
  return !!s?.isLostStage || /^lost$/i.test(String(s?.name ?? '').trim());
}

export function iconForStageName(name: string): IconSvgElement {
  const n = String(name ?? '')
    .trim()
    .toLowerCase();
  if (n === 'draft') return FileEditIcon;
  if (n === 'assign') return UserAdd01Icon;
  if (n === 'cold calling' || n === 'new/contacted') return Call02Icon;
  if (n === 'site visit') return Location01Icon;
  if (n === 'visited') return Calendar03Icon;
  if (n === 'negotiation' || n === 'qualified/interested') return HandshakeIcon;
  if (n === 'won' || n === 'booked/won') return TrophyIcon;
  if (n === 'lost') return CancelCircleIcon;
  return HandshakeIcon;
}

function isOutlineHiddenStatus(s: PipelineStatus) {
  // Draft is internal — never shown on the lead-detail pipeline outline.
  return /^draft$/i.test(String(s.name ?? '').trim());
}

/** Same pipeline grouping as web LeadDetailPage. */
export function buildPipelineSteps(
  statuses: PipelineStatus[]
): PipelineStep[] {
  const linear: PipelineStatus[] = [];
  const terminals: PipelineStatus[] = [];
  for (const s of statuses) {
    if (isOutlineHiddenStatus(s)) continue;
    if (isWonStatus(s) || isLostStatus(s)) terminals.push(s);
    else linear.push(s);
  }

  const steps: PipelineStep[] = linear.map((s) => ({
    key: String(s.id),
    label: shortPipelineLabel(String(s.name ?? '')),
    icon: iconForStageName(String(s.name ?? '')),
    statusIds: [s.id],
    statuses: [s],
  }));

  if (terminals.length > 0) {
    steps.push({
      key: 'terminal-won-lost',
      label: 'Won / Lost',
      icon: TrophyIcon,
      statusIds: terminals.map((t) => t.id),
      statuses: terminals,
      isTerminal: true,
    });
  }

  return steps;
}
