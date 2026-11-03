import { format } from 'date-fns/format';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useEffect, useState } from 'react';

import {
  Building2Icon,
  CalendarClockIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClipboardCheckIcon,
  LucideHandshakeIcon,
  HardHatIcon,
  HeadsetIcon,
  LandPlotIcon,
  MapPinnedIcon,
  MessageSquareIcon,
  LucidePhoneOutgoingIcon,
} from '@/components/icons/hugeicons';
import type { LeadListItem } from '@/types/api';
import { parseDate } from '@/utils/dates';

/** Card style of a follow-up — matches the calendar reference (bell / box / calendar). */
export type FollowUpKind = 'reminder' | 'todo' | 'event';

const KINDS: readonly FollowUpKind[] = ['reminder', 'todo', 'event'];

/** One lead status always gets the same card style, so colors stay meaningful. */
export function followUpKind(lead: LeadListItem): FollowUpKind {
  return KINDS[Math.abs(lead.leadStatus?.id ?? 0) % KINDS.length];
}

export type KindTone = { bg: string; accent: string };

export function kindTones(isDark: boolean): Record<FollowUpKind, KindTone> {
  return isDark
    ? {
        reminder: { bg: 'rgba(56,170,240,0.16)', accent: '#5BB8F5' },
        todo: { bg: 'rgba(40,190,130,0.16)', accent: '#3FCF94' },
        event: { bg: 'rgba(245,140,95,0.16)', accent: '#F59A73' },
      }
    : {
        reminder: { bg: '#DFF3FD', accent: '#3B9EE8' },
        todo: { bg: '#EAF8F1', accent: '#22B07D' },
        event: { bg: '#FDF1EB', accent: '#F2855A' },
      };
}

export function followUpLabel(lead: LeadListItem) {
  return lead.leadStatus?.name?.trim() || 'Follow-up';
}

export function leadName(lead: LeadListItem) {
  return lead.buyerPersona?.fullName?.trim() || 'Unknown lead';
}

export function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

export function dayKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export type DayFollowUp = { lead: LeadListItem; due: Date };

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

/** Dot under a calendar day: red if its first follow-up is overdue, else that card's accent. */
export function dayDotColor(
  list: DayFollowUp[] | undefined,
  now: number,
  tones: Record<FollowUpKind, KindTone>,
  overdueColor: string
) {
  const first = list?.[0];
  if (!first) return null;
  return first.due.getTime() < now ? overdueColor : tones[followUpKind(first.lead)].accent;
}

/** Follow-ups per calendar day (`yyyy-MM-dd`), each day sorted by due time. */
export function groupByDay(leads: readonly LeadListItem[]) {
  const byDay = new Map<string, DayFollowUp[]>();
  for (const lead of leads) {
    const due = parseDate(lead.nextFollowupDate);
    if (!due || Number.isNaN(due.getTime())) continue;
    const key = dayKey(due);
    const list = byDay.get(key);
    if (list) list.push({ lead, due });
    else byDay.set(key, [{ lead, due }]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.due.getTime() - b.due.getTime());
  }
  return byDay;
}

/** Badge icon for a lead status name — same rules as the web admin's statusTypeIcon. */
export function statusTypeIcon(name: string): IconSvgElement {
  const n = name.trim().toLowerCase();
  if (/cold\s*call/.test(n)) return HeadsetIcon;
  if (/site\s*visit/.test(n)) return MapPinnedIcon;
  if (/^visited$/.test(n)) return ClipboardCheckIcon;
  if (/office/.test(n)) return Building2Icon;
  if (/project/.test(n)) return HardHatIcon;
  if (/negotiat/.test(n)) return LucideHandshakeIcon;
  if (/^won$/.test(n)) return CircleCheckIcon;
  if (/^lost$/.test(n)) return CircleXIcon;
  if (/phone|call/.test(n)) return LucidePhoneOutgoingIcon;
  if (/visit/.test(n)) return LandPlotIcon;
  return MessageSquareIcon;
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
