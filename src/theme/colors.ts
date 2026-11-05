/**
 * Salesfast CRM app brand — blue, matched to the home hero.
 *
 *   Primary  #0A4FC0 · pressed #083E99 · soft #C9DCFB (dark mode: #3B82F6)
 *   Page wash #F7F7F7 (Hisab surface) · Navy #15202C
 */

export type ThemeColors = {
  brand: string;
  brandMuted: string;
  brandSoft: string;
  /** Brand soft tint — icon chips / accents (not page wash). */
  primary50: string;
  /** Logo navy — secondary ink / accents */
  accent: string;
  accentSoft: string;
  /** Page wash */
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  white: string;
  black: string;
};

/**
 * TEXT-MAIN scale (design tokens):
 *   light  #484848 · normal #767676 · dark #9c9c9c
 */
export const lightColors: ThemeColors = {
  brand: '#0A4FC0',
  brandMuted: '#083E99',
  brandSoft: '#C9DCFB',
  primary50: '#EDF3FE',
  accent: '#484848',
  accentSoft: '#E7EAED',
  background: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F2',
  border: '#E5E7EB',
  text: '#484848',
  textSecondary: '#767676',
  textMuted: '#9c9c9c',
  danger: '#F04438',
  dangerSoft: '#FEE4E2',
  success: '#12B76A',
  successSoft: '#DCFAE6',
  warning: '#F79009',
  warningSoft: '#FEF0C7',
  white: '#FFFFFF',
  black: '#000000',
};

/**
 * Dark surface stack:
 *   #000000 page · #121212 cards · #1B1B1B muted / elevated
 * Main text white; TEXT-MAIN scale for secondary / muted.
 */
export const darkColors: ThemeColors = {
  brand: '#3B82F6',
  brandMuted: '#60A5FA',
  brandSoft: '#0F1E3A',
  primary50: '#0B1730',
  accent: '#FFFFFF',
  accentSoft: '#1B1B1B',
  background: '#000000',
  surface: '#121212',
  surfaceMuted: '#1B1B1B',
  border: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#9c9c9c',
  textMuted: '#767676',
  danger: '#F97066',
  dangerSoft: '#2A1210',
  success: '#32D583',
  successSoft: '#0F1F18',
  warning: '#FDB022',
  warningSoft: '#241A08',
  white: '#FFFFFF',
  black: '#000000',
};

/** @deprecated Prefer `useTheme().colors` — static light fallback for non-UI modules. */
export const colors = lightColors;

export type ColorName = keyof ThemeColors;
