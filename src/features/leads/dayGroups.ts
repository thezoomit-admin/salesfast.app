import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { parseISO } from 'date-fns/parseISO';

export function dayKeyOf(value?: string | Date | null): string {
  if (!value) return 'unknown';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    if (Number.isNaN(d.getTime())) return 'unknown';
    return format(d, 'yyyy-MM-dd');
  } catch {
    return 'unknown';
  }
}

export function dayLabelOf(value?: string | Date | null): string {
  if (!value) return 'Unknown date';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    if (Number.isNaN(d.getTime())) return 'Unknown date';
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM yyyy');
  } catch {
    return 'Unknown date';
  }
}

export function timeOf(value?: string | Date | null): string {
  if (!value) return '—';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'hh:mm a');
  } catch {
    return '—';
  }
}

/** Group items by calendar day, preserving input order within each day. */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | Date | null | undefined
): Array<{ key: string; label: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKeyOf(getDate(item));
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()].map(([key, groupItems]) => ({
    key,
    label:
      key === 'unknown'
        ? 'Unknown date'
        : dayLabelOf(getDate(groupItems[0]!)),
    items: groupItems,
  }));
}
