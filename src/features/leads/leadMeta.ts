import type { LeadMeta } from '@/types/api';

/** Resolve a stored option key to its human label (matches web portal). */
export function labelOf(
  meta: LeadMeta | null | undefined,
  group: string,
  key: string | null | undefined,
  fixed = false
): string {
  if (!key) return '';
  const src = fixed ? meta?.fixed[group] : meta?.options[group];
  const hit = src?.find((o) => o.key === key);
  if (hit) return hit.label;
  const gone = meta?.removed[group]?.find((o) => o.key === key);
  return gone ? `${gone.label} (no longer offered)` : key;
}

export function labelsOf(
  meta: LeadMeta | null | undefined,
  group: string,
  keys?: string[] | null,
  fixed = false
): string | null {
  const list = (keys ?? [])
    .map((k) => labelOf(meta, group, k, fixed))
    .filter(Boolean);
  return list.length ? list.join(', ') : null;
}
