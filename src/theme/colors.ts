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

/** Dark surface stack — brand orange kept for CTAs / accents. */
export const darkColors: ThemeColors = {
  brand: '#F2461C',
  brandMuted: '#FF6A45',
  brandSoft: '#3D1F16',
  primary50: '#2A1814',
  accent: '#E7EAED',
  accentSoft: '#24303A',
  background: '#0F1419',
  surface: '#1A222C',
  surfaceMuted: '#242D38',
  border: '#2E3742',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  danger: '#F97066',
  dangerSoft: '#3B1A18',
  success: '#32D583',
  successSoft: '#0F2E22',
  warning: '#FDB022',
  warningSoft: '#3A2A0E',
  white: '#FFFFFF',
  black: '#000000',
};

/** @deprecated Prefer `useTheme().colors` — static light fallback for non-UI modules. */
export const colors = lightColors;

export type ColorName = keyof ThemeColors;
