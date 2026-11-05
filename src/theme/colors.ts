/**
 * Salesfast CRM app brand — blue.
 *
 *   Primary  #3A83F7 · pressed #2A6FE0 · soft #C9DCFB
 *   Page wash #F7F7F7 (Hisab surface) · Navy #15202C
 */

/**
 * Blue variants around the brand (500). `sky` and `indigo` are for the places
 * that need a second or third colour next to brand blue, such as icon sets,
 * category tags and avatar tones.
 */
export const blue = {
  50: '#EDF3FE',
  100: '#DCE8FD',
  200: '#C9DCFB',
  300: '#9DC1FA',
  400: '#6CA3F9',
  500: '#3A83F7',
  600: '#2A6FE0',
  700: '#1F57B8',
  800: '#18448F',
  900: '#112F63',
  sky: '#0B8FE0',
  skySoft: '#DFF1FD',
  indigo: '#4C62F0',
  indigoSoft: '#E9ECFE',
} as const;

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
  brand: blue[500],
  brandMuted: blue[600],
  brandSoft: blue[200],
  primary50: blue[50],
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
  brand: blue[500],
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
