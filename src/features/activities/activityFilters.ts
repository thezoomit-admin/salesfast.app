import { startOfDay } from 'date-fns/startOfDay';
import { subDays } from 'date-fns/subDays';

import type { ActivityKind } from './activityDisplay';

export type ActivityTypeFilter =
  | 'call'
  | 'missed'
  | 'whatsapp'
  | 'inPerson'
  | 'note'
  | 'followUp'
  | 'email';

export type ActivityDateFilter = 'today' | 'yesterday' | 'last7' | 'last30';

export type ActivityFilters = {
  types: ActivityTypeFilter[];
  dates: ActivityDateFilter[];
};

export const NO_FILTERS: ActivityFilters = { types: [], dates: [] };

export const TYPE_OPTIONS: {
  key: ActivityTypeFilter;
  label: string;
  /** Same icon and colour as the rows this option finds. */
  kind: ActivityKind;
}[] = [
  { key: 'call', label: 'Calls', kind: 'call' },
  { key: 'missed', label: 'Missed calls', kind: 'callMissed' },
  { key: 'whatsapp', label: 'WhatsApp', kind: 'whatsapp' },
  { key: 'inPerson', label: 'In person', kind: 'inPerson' },
  { key: 'note', label: 'Notes', kind: 'note' },
  { key: 'followUp', label: 'Follow-ups', kind: 'followUp' },
  { key: 'email', label: 'Email', kind: 'email' },
];

export const DATE_OPTIONS: { key: ActivityDateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
];

export const filterCount = (filters: ActivityFilters) =>
  filters.types.length + filters.dates.length;

/**
 * The date picks as one range, in the user's own day. Any mix of them touches,
 * so their union has no gaps; only Yesterday on its own stops before today.
 */
export function activityDateRange(
  dates: readonly ActivityDateFilter[],
  now = new Date()
): { from?: string; to?: string } {
  if (dates.length === 0) return {};
  const today = startOfDay(now);
  const starts: Record<ActivityDateFilter, Date> = {
    today,
    yesterday: subDays(today, 1),
    last7: subDays(today, 6),
    last30: subDays(today, 29),
  };
  const from = Math.min(...dates.map((d) => starts[d].getTime()));
  const yesterdayOnly = dates.length === 1 && dates[0] === 'yesterday';
  return {
    from: new Date(from).toISOString(),
    to: yesterdayOnly ? new Date(today.getTime() - 1).toISOString() : undefined,
  };
}
