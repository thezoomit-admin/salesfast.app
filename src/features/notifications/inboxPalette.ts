/**
 * The inbox design's own colours: a brighter blue than the brand, navy ink,
 * and a tint per notification type. Kept out of `@/theme` so other screens
 * don't pick them up; the tab bar and the Home sections use it on purpose.
 */

export type InboxTone = 'blue' | 'red' | 'sky' | 'green' | 'purple';

type ToneColors = { fg: string; bg: string };

export type InboxPalette = {
  accent: string;
  /** Text on `accent`. */
  onAccent: string;
  ink: string;
  inkSoft: string;
  sheet: string;
  card: string;
  cardBorder: string;
  track: string;
  trackBorder: string;
  pill: string;
  count: string;
  rule: string;
  alert: string;
  tones: Record<InboxTone, ToneColors>;
};

const light: InboxPalette = {
  accent: '#005BED',
  onAccent: '#FFFFFF',
  ink: '#14184A',
  inkSoft: '#4A4E7C',
  sheet: '#FBFCFF',
  card: '#FFFFFF',
  cardBorder: '#EEF0FA',
  track: '#F7F8FE',
  trackBorder: '#E8EBFA',
  pill: '#EEF1FD',
  count: '#CBD9FD',
  rule: '#C9CDE0',
  alert: '#F73823',
  tones: {
    blue: { fg: '#005BED', bg: '#E4ECFE' },
    red: { fg: '#F23B3B', bg: '#FEE5E4' },
    sky: { fg: '#0B8FE0', bg: '#DFF1FD' },
    green: { fg: '#0F8F5F', bg: '#E5F5EF' },
    purple: { fg: '#5B21E6', bg: '#EEE8FF' },
  },
};

const dark: InboxPalette = {
  accent: '#3D84FF',
  onAccent: '#FFFFFF',
  ink: '#FFFFFF',
  inkSoft: '#A3A9C4',
  sheet: '#0E1016',
  card: '#171A23',
  cardBorder: '#252A38',
  track: '#171A23',
  trackBorder: '#252A38',
  pill: '#222838',
  count: '#2F3C5C',
  rule: '#3A4054',
  alert: '#FF5A47',
  tones: {
    blue: { fg: '#6FA3FF', bg: '#16233F' },
    red: { fg: '#FF7A7A', bg: '#3A1718' },
    sky: { fg: '#5CC3F7', bg: '#0F2A3A' },
    green: { fg: '#3DD598', bg: '#10302A' },
    purple: { fg: '#A98BFF', bg: '#251C47' },
  },
};

export function inboxPalette(isDark: boolean) {
  return isDark ? dark : light;
}
