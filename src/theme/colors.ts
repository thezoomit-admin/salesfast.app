/**
 * Salesfast CRM brand — matched to logo + admin palette.
 *
 *   Primary  #F2461C · pressed #D93B14 · soft #FBD2C2
 *   primary-50 #FEF2EC (page wash) · Navy #15202C
 */
export const colors = {
  brand: '#F2461C',
  brandMuted: '#D93B14',
  brandSoft: '#FBD2C2',
  /** Tailwind primary-50 — light page background */
  primary50: '#FEF2EC',
  /** Logo navy — secondary ink / accents */
  accent: '#15202C',
  accentSoft: '#E7EAED',
  background: '#FEF2EC',
  surface: '#FFFFFF',
  surfaceMuted: '#FDDFCF',
  border: '#F0E0D8',
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
