import { labelOf, labelsOf } from '@/features/leads/leadMeta';
import type { LeadDetail, LeadMeta } from '@/types/api';

/** Display-ready fields for Buyer Profile (mirrors web portal summarizeLead). */
export type LeadSummary = {
  occupation: string | null;
  propertyType: string | null;
  location: string | null;
  size: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  financing: string | null;
  timeline: string | null;
};

const humanize = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v))
    ? null
    : Number(v);

const text = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || null;
};

const known = (key?: string | null) => (key && key !== 'unknown' ? key : null);

function one(
  meta: LeadMeta | null | undefined,
  group: string,
  key?: string | null,
  fixed = false
): string | null {
  if (!key) return null;
  if (!meta) return humanize(key);
  return labelOf(meta, group, key, fixed) || null;
}

export function formatMoney(n: unknown): string | null {
  if (n == null || n === '') return null;
  return `৳ ${Number(n).toLocaleString('en-IN')}`;
}

export function summarizeLead(
  lead: LeadDetail,
  meta?: LeadMeta | null
): LeadSummary {
  const profile = lead.buyerPersona?.profile ?? {};

  const category = one(meta, 'occupation_category', lead.occupationCategory);
  const detail = text(lead.occupationDetail);
  const occupation = category
    ? detail
      ? `${category} — ${detail}`
      : category
    : text(profile.occupation);

  const sizeParts: string[] = [];
  const beds = one(meta, 'bedrooms', lead.bedrooms, true);
  if (beds) sizeParts.push(lead.bedrooms === 'studio' ? beds : `${beds} bed`);
  if (lead.unitSizeMin != null || lead.unitSizeMax != null) {
    sizeParts.push(
      `${lead.unitSizeMin ?? '—'}–${lead.unitSizeMax ?? '—'} sq ft`
    );
  }

  return {
    occupation,
    propertyType:
      labelsOf(meta, 'property_type', lead.propertyTypes) ??
      text(profile.propertyType),
    location:
      labelsOf(meta, 'preferred_location', lead.preferredLocations) ??
      text(profile.locationPref),
    size: sizeParts.length ? sizeParts.join(' · ') : text(profile.sizePref),
    budgetMin: num(lead.budgetMin) ?? num(profile.budgetMin),
    budgetMax: num(lead.budgetMax) ?? num(profile.budgetMax),
    financing:
      one(meta, 'financing_required', known(lead.financingRequired), true) ??
      text(profile.financingMethod),
    timeline:
      one(meta, 'purchase_timeline', known(lead.purchaseTimeline), true) ??
      text(profile.timeline),
  };
}

/** Same 14 fields shown in LeadBuyerProfilePanel — keep order in sync with the grid. */
const PROFILE_ITEMS: {
  label: string;
  filled: (lead: LeadDetail, s: LeadSummary) => boolean;
}[] = [
  { label: 'Occupation', filled: (_l, s) => !!s.occupation },
  {
    label: 'NID',
    filled: (l) => !!String(l.buyerPersona?.profile?.nid ?? '').trim(),
  },
  { label: 'Property type', filled: (_l, s) => !!s.propertyType },
  { label: 'Preferred location', filled: (_l, s) => !!s.location },
  { label: 'Size / unit', filled: (_l, s) => !!s.size },
  { label: 'Budget min', filled: (_l, s) => s.budgetMin != null },
  { label: 'Budget max', filled: (_l, s) => s.budgetMax != null },
  { label: 'Financing', filled: (_l, s) => !!s.financing },
  { label: 'Timeline', filled: (_l, s) => !!s.timeline },
  {
    label: 'Source',
    filled: (l) => !!String(l.leadSource?.name ?? '').trim(),
  },
  {
    label: 'Assigned to',
    filled: (l) =>
      !!String(l.assignedToName ?? '').trim() || !!String(l.assignedTo ?? '').trim(),
  },
  {
    label: 'Next follow-up',
    filled: (l) => !!(l.pendingFollowUp?.dueAt ?? l.nextFollowupDate),
  },
  {
    label: 'Email',
    filled: (l) => !!String(l.buyerPersona?.email ?? '').trim(),
  },
  {
    label: 'Address',
    filled: (l) => !!String(l.buyerPersona?.address ?? '').trim(),
  },
];

export function profileCompletion(
  lead: LeadDetail,
  meta?: LeadMeta | null
): { filled: number; total: number; pct: number; missing: string[] } {
  const s = summarizeLead(lead, meta);
  const total = PROFILE_ITEMS.length;
  const filled = PROFILE_ITEMS.filter((i) => i.filled(lead, s)).length;
  return {
    filled,
    total,
    pct: total ? Math.round((filled / total) * 100) : 0,
    missing: PROFILE_ITEMS.filter((i) => !i.filled(lead, s)).map((i) => i.label),
  };
}
