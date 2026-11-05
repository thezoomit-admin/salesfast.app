import { format } from 'date-fns/format';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useEffect, useState } from 'react';

import {
  Building2Icon,
  CalendarClockIcon,
  HeadsetIcon,
  MapPinnedIcon,
  MessageSquareIcon,
} from '@/components/icons/hugeicons';
import { blue } from '@/theme';
import type { MyFollowUp } from '@/types/api';

/** Card colour family of a follow-up, from its type. */
export type FollowUpKind = 'reminder' | 'todo' | 'event';

/** Visits are events, calls are reminders, everything else is a to-do. */
export function followUpKind(type: string | null | undefined): FollowUpKind {
  if (type === 'SITE_VISIT' || type === 'OFFICE_VISIT') return 'event';
  if (type === 'COLD_CALL') return 'reminder';
  return 'todo';
}

export type KindTone = { bg: string; accent: string };

export function kindTones(isDark: boolean): Record<FollowUpKind, KindTone> {
  return isDark
    ? {
        reminder: { bg: 'rgba(56,170,240,0.16)', accent: '#5BB8F5' },
        todo: { bg: 'rgba(40,190,130,0.16)', accent: '#3FCF94' },
        event: { bg: 'rgba(76,98,240,0.18)', accent: '#8A9BFF' },
      }
    : {
        reminder: { bg: '#DFF3FD', accent: '#3B9EE8' },
        todo: { bg: '#EAF8F1', accent: '#22B07D' },
        event: { bg: blue.indigoSoft, accent: blue.indigo },
      };
}

const TYPE_LABEL: Record<string, string> = {
  FOLLOWUP: 'Follow-up',
  FOLLOW_UP: 'Follow-up',
  OFFICE_VISIT: 'Office visit',
  SITE_VISIT: 'Site visit',
  COLD_CALL: 'Cold call',
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
};

/** Same labels as the web admin's follow-up type options. */
export function followUpTypeLabel(type: string | null | undefined) {
  if (!type?.trim()) return 'Follow-up';
  return TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

/** Badge icon for a follow-up type — same as the web admin's followupTypeIcon. */
export function followupTypeIcon(type: string | null | undefined): IconSvgElement {
  switch (type) {
    case 'SITE_VISIT':
      return MapPinnedIcon;
    case 'OFFICE_VISIT':
      return Building2Icon;
    case 'COLD_CALL':
      return HeadsetIcon;
    case 'FOLLOWUP':
      return CalendarClockIcon;
    default:
      return MessageSquareIcon;
  }
}

/**
 * Where a follow-up stands. Overdue = still open past its due time; Missed =
 * still open 24h after (the nightly scan); Done vs Late = completed within
 * 24h of due or after, the same rule as the admin performance report.
 */
export type FollowUpState = 'upcoming' | 'overdue' | 'missed' | 'done' | 'late';

export function followUpState(
  f: Pick<MyFollowUp, 'status' | 'onTime'>,
  due: Date,
  now: Date
): FollowUpState {
  if (f.status === 'DONE') return f.onTime === false ? 'late' : 'done';
  if (f.status === 'MISSED') return 'missed';
  return due.getTime() < now.getTime() ? 'overdue' : 'upcoming';
}

export const isClosedState = (s: FollowUpState) => s === 'done' || s === 'late';

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

export function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export type DayFollowUp = { item: MyFollowUp; due: Date };

export const NO_FOLLOW_UPS: DayFollowUp[] = [];

/** Current time, refreshed every minute (overdue labels, the "now" line). */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Dot under a calendar day: red when something there is overdue or missed,
 * green when everything is done, else the first open card's accent.
 */
export function dayDotColor(
  list: DayFollowUp[] | undefined,
  now: Date,
  tones: Record<FollowUpKind, KindTone>,
  colors: { danger: string; success: string }
) {
  if (!list?.length) return null;
  let firstOpen: DayFollowUp | null = null;
  for (const entry of list) {
    const state = followUpState(entry.item, entry.due, now);
    if (state === 'overdue' || state === 'missed') return colors.danger;
    if (!firstOpen && !isClosedState(state)) firstOpen = entry;
  }
  return firstOpen ? tones[followUpKind(firstOpen.item.type)].accent : colors.success;
}

/** Follow-ups per calendar day (`yyyy-MM-dd`), each day sorted by due time. */
export function groupByDay(items: readonly MyFollowUp[]) {
  const byDay = new Map<string, DayFollowUp[]>();
  for (const item of items) {
    const due = new Date(item.dueAt);
    if (Number.isNaN(due.getTime())) continue;
    const key = dayKey(due);
    const list = byDay.get(key);
    if (list) list.push({ item, due });
    else byDay.set(key, [{ item, due }]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.due.getTime() - b.due.getTime());
  }
  return byDay;
}
