/**
 * Salesfast CRM brand — matched to logo + admin palette.
 *
 *   Primary  #F2461C · pressed #D93B14 · soft #FBD2C2
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

export const lightColors: ThemeColors = {
  brand: '#F2461C',
  brandMuted: '#D93B14',
  brandSoft: '#FBD2C2',
  primary50: '#FEF2EC',
  accent: '#15202C',
  accentSoft: '#E7EAED',
  background: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F2',
  border: '#E5E7EB',
  text: '#15202C',
  textSecondary: '#5B6B7A',
  textMuted: '#98A2B3',
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
 * Dark surface stack — pure black page + #121212 elevated cards.
 * Brand orange kept for CTAs / accents.
 */
export const darkColors: ThemeColors = {
  brand: '#F2461C',
  brandMuted: '#FF6A45',
  brandSoft: '#2A1610',
  primary50: '#1F120E',
  accent: '#F3F4F6',
  accentSoft: '#1A1A1A',
  background: '#000000',
  surface: '#121212',
  surfaceMuted: '#1A1A1A',
  border: '#2A2A2A',
  text: '#F3F4F6',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
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
