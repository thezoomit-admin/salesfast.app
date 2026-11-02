/**
 * Salesfast CRM brand — matched to logo + admin palette.
 *
 *   Primary  #F2461C · pressed #D93B14 · soft #FBD2C2
 *   Page wash #F7F7F7 (Hisab surface) · Navy #15202C
 */
export const colors = {
  brand: '#F2461C',
  brandMuted: '#D93B14',
  brandSoft: '#FBD2C2',
  /** Brand soft tint — icon chips / accents (not page wash). */
  primary50: '#FEF2EC',
  /** Logo navy — secondary ink / accents */
  accent: '#15202C',
  accentSoft: '#E7EAED',
  /** Hisab page wash */
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
} as const;

export type ColorName = keyof typeof colors;
