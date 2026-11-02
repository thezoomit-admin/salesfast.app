import type { LeadPriority } from '@/types/api';

export const PRIORITY_META: Record<
  LeadPriority,
  { label: string; color: string; bg: string; border: string }
> = {
  LOW: { label: 'Low', color: '#0ba5ec', bg: '#EFF8FF', border: '#B2E0FE' },
  MEDIUM: {
    label: 'Medium',
    color: '#d97706',
    bg: '#FFFAEB',
    border: '#FEE399',
  },
  HIGH: { label: 'High', color: '#f04438', bg: '#FFF1F0', border: '#FECDC9' },
};

export const PRIORITIES: LeadPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

function mix(
  hex: string,
  target: { r: number; g: number; b: number },
  amount: number
): string {
  const raw = hex.trim().replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return hex;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const h = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r + (target.r - r) * amount)}${h(g + (target.g - g) * amount)}${h(b + (target.b - b) * amount)}`;
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/** Light pastel chip in light mode; darkened tint in dark mode. */
export function priorityBadgeColors(priority: LeadPriority, isDark: boolean) {
  const meta = PRIORITY_META[priority];
  if (!isDark) {
    return {
      backgroundColor: meta.bg,
      borderColor: meta.border,
      color: meta.color,
    };
  }
  return {
    backgroundColor: mix(meta.color, BLACK, 0.72),
    borderColor: mix(meta.color, BLACK, 0.5),
    color: mix(meta.color, WHITE, 0.38),
  };
}
