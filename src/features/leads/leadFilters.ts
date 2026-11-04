import { addDays } from 'date-fns/addDays';
import { endOfDay } from 'date-fns/endOfDay';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { subDays } from 'date-fns/subDays';
import { subMonths } from 'date-fns/subMonths';

import { PRIORITY_META, PRIORITIES } from '@/features/leads/leadPriority';
import type { LeadPriority } from '@/types/api';

export type LeadSort = 'newest' | 'oldest' | 'activity';

export type LeadFollowUpFilter =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'next7'
  | 'none';

export type LeadCreatedFilter =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth';

export type LeadEngagementFilter =
  | 'UNOPENED'
  | 'OPENED'
  | 'WORK_STARTED'
  | 'COMPLETED';

export type LeadFilters = {
  sort: LeadSort;
  priorities: LeadPriority[];
  followUp: LeadFollowUpFilter | null;
  engagement: LeadEngagementFilter | null;
  created: LeadCreatedFilter | null;
  sourceIds: number[];
};

export const NO_LEAD_FILTERS: LeadFilters = {
  sort: 'newest',
  priorities: [],
  followUp: null,
  engagement: null,
  created: null,
  sourceIds: [],
};

export const SORT_OPTIONS: { key: LeadSort; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'activity', label: 'Recently updated' },
];

export const FOLLOW_UP_OPTIONS: { key: LeadFollowUpFilter; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due today' },
  { key: 'tomorrow', label: 'Due tomorrow' },
  { key: 'next7', label: 'Next 7 days' },
  { key: 'none', label: 'No follow-up' },
];

export const ENGAGEMENT_OPTIONS: {
  key: LeadEngagementFilter;
  label: string;
}[] = [
  { key: 'UNOPENED', label: 'Unopened' },
  { key: 'OPENED', label: 'Opened' },
  { key: 'WORK_STARTED', label: 'Work started' },
  { key: 'COMPLETED', label: 'Completed' },
];

export const CREATED_OPTIONS: { key: LeadCreatedFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
];

/** High first, the order a sales agent scans them. */
export const PRIORITY_OPTIONS: { key: LeadPriority; label: string }[] = [
  ...PRIORITIES,
]
  .reverse()
  .map((key) => ({ key, label: PRIORITY_META[key].label }));

/** A non-default sort counts too, so the header shows the list is reordered. */
export const leadFilterCount = (filters: LeadFilters) =>
  (filters.sort === 'newest' ? 0 : 1) +
  filters.priorities.length +
  filters.sourceIds.length +
  (filters.followUp ? 1 : 0) +
  (filters.engagement ? 1 : 0) +
  (filters.created ? 1 : 0);

type Range = { from?: Date; to?: Date };

/**
 * Days are the user's own, not the server's: the API runs in UTC, so its
 * "today" presets would be six hours off in Dhaka.
 */
function followUpRange(key: LeadFollowUpFilter, now: Date): Range {
  const today = startOfDay(now);
  switch (key) {
    // Same line as the Follow-ups tab: past its due time, not just past today.
    case 'overdue':
      return { to: now };
    case 'today':
      return { from: today, to: endOfDay(today) };
    case 'tomorrow': {
      const tomorrow = addDays(today, 1);
      return { from: tomorrow, to: endOfDay(tomorrow) };
    }
    case 'next7':
      return { from: today, to: endOfDay(addDays(today, 6)) };
    case 'none':
      return {};
  }
}

function createdRange(key: LeadCreatedFilter, now: Date): Range {
  const today = startOfDay(now);
  switch (key) {
    case 'today':
      return { from: today };
    case 'yesterday': {
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: endOfDay(yesterday) };
    }
    case 'last7':
      return { from: subDays(today, 6) };
    case 'last30':
      return { from: subDays(today, 29) };
    case 'thisMonth':
      return { from: startOfMonth(today) };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  }
}

export type LeadFilterParams = {
  sort?: LeadSort;
  priority?: string;
  leadSourceId?: string;
  engagement?: LeadEngagementFilter;
  followupNone?: boolean;
  followupFrom?: string;
  followupTo?: string;
  dateFrom?: string;
  dateTo?: string;
};

/** Filters as request params. Ranges use `now`, so a cached pick stays current. */
export function leadFilterParams(
  filters: LeadFilters,
  now = new Date()
): LeadFilterParams {
  const followUp = filters.followUp ? followUpRange(filters.followUp, now) : {};
  const created = filters.created ? createdRange(filters.created, now) : {};
  return {
    sort: filters.sort === 'newest' ? undefined : filters.sort,
    priority: filters.priorities.join(',') || undefined,
    leadSourceId: filters.sourceIds.join(',') || undefined,
    engagement: filters.engagement ?? undefined,
    followupNone: filters.followUp === 'none' ? true : undefined,
    followupFrom: followUp.from?.toISOString(),
    followupTo: followUp.to?.toISOString(),
    dateFrom: created.from?.toISOString(),
    dateTo: created.to?.toISOString(),
  };
}

export type LeadFilterPill = {
  key: string;
  label: string;
  /** The filters once this pill is removed. */
  without: LeadFilters;
};

const labelOf = <K>(options: { key: K; label: string }[], key: K) =>
  options.find((o) => o.key === key)?.label ?? '';

/** One removable pill per pick, in the same order as the sheet. */
export function leadFilterPills(
  filters: LeadFilters,
  sources: readonly { id: number; name: string }[] = []
): LeadFilterPill[] {
  const pills: LeadFilterPill[] = [];
  if (filters.sort !== 'newest') {
    pills.push({
      key: 'sort',
      label: labelOf(SORT_OPTIONS, filters.sort),
      without: { ...filters, sort: 'newest' },
    });
  }
  for (const priority of filters.priorities) {
    pills.push({
      key: `priority-${priority}`,
      label: `${PRIORITY_META[priority].label} priority`,
      without: {
        ...filters,
        priorities: filters.priorities.filter((p) => p !== priority),
      },
    });
  }
  if (filters.followUp) {
    pills.push({
      key: 'followUp',
      label: labelOf(FOLLOW_UP_OPTIONS, filters.followUp),
      without: { ...filters, followUp: null },
    });
  }
  if (filters.engagement) {
    pills.push({
      key: 'engagement',
      label: labelOf(ENGAGEMENT_OPTIONS, filters.engagement),
      without: { ...filters, engagement: null },
    });
  }
  if (filters.created) {
    pills.push({
      key: 'created',
      label: `Created: ${labelOf(CREATED_OPTIONS, filters.created)}`,
      without: { ...filters, created: null },
    });
  }
  for (const id of filters.sourceIds) {
    pills.push({
      key: `source-${id}`,
      label: sources.find((s) => s.id === id)?.name ?? 'Source',
      without: {
        ...filters,
        sourceIds: filters.sourceIds.filter((s) => s !== id),
      },
    });
  }
  return pills;
}
