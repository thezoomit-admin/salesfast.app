// Per-function entry points: the package root re-exports all ~250 helpers,
// and Metro bundles every one of them.
import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { isYesterday } from 'date-fns/isYesterday';
import { parseISO } from 'date-fns/parseISO';

export function parseDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    return parseISO(value);
  } catch {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

export function formatDateTime(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  return format(d, 'dd MMM yyyy, h:mm a');
}

export function formatDate(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'dd MMM yyyy');
}

/** Calendar date only — e.g. target purchase (matches web portal DD MMM YYYY). */
export function formatCalendarDate(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  return format(d, 'dd MMM yyyy');
}

/** "09:41 AM". */
export function formatClockTime(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  return format(d, 'hh:mm a');
}

/** List section heading — "Today", "Yesterday", "27 November 2026". */
export function formatDayHeading(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMMM yyyy');
}

/** "Today, 29th November", "Tomorrow, 30th November", "27th November". */
export function formatDueDay(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';
  const day = format(d, 'do MMMM');
  if (isToday(d)) return `Today, ${day}`;
  if (isTomorrow(d)) return `Tomorrow, ${day}`;
  if (isYesterday(d)) return `Yesterday, ${day}`;
  return day;
}

/** Compact relative time — "Just now", "5m ago", "2h ago", "3d ago". */
export function formatRelative(value?: string | Date | null) {
  const d = parseDate(value);
  if (!d) return '—';

  const diffMs = Date.now() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);

  let label: string;
  if (mins < 1) label = 'Just now';
  else if (mins < 60) label = `${mins}m ago`;
  else if (hours < 24) label = `${hours}h ago`;
  else if (days < 7) label = `${days}d ago`;
  else return format(d, 'dd MMM yyyy');

  if (label === 'Just now') return label;
  return future ? label.replace(' ago', ' from now') : label;
}

/** Lead card label — "Overdue by 2 days", today's time, or last update. */
export function followupWhenLabel(
  nextFollowupDate?: string | null,
  updatedAt?: string | null
) {
  const due = parseDate(nextFollowupDate);
  if (due) {
    const dayDiff = differenceInCalendarDays(new Date(), due);
    if (dayDiff > 0) {
      return dayDiff === 1 ? 'Overdue by 1 day' : `Overdue by ${dayDiff} days`;
    }
    if (isToday(due)) return format(due, 'h:mm a');
    if (isYesterday(due)) return 'Yesterday';
    return format(due, 'dd MMM');
  }
  return formatRelative(updatedAt);
}

export function startOfLocalDayIso(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

export function endOfLocalDayIso(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
