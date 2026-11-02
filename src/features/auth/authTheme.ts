import { colors } from '@/theme';

/**
 * Auth / splash tokens — layout follows Hisab; colors from shared Salesfast brand.
 */
export const authColors = {
  /** Splash — solid black (matches favicon plate). */
  splash: colors.black,
  primary: colors.brand,
  primaryPressed: colors.brandMuted,
  primarySoft: colors.brandSoft,
  /** Login page wash — primary-50. */
  cream: colors.primary50,
  background: colors.surface,
  border: '#E0E0E0',
  borderFocus: colors.brand,
  inputBg: colors.surface,
  text: '#1A1A1A',
  textSecondary: colors.textSecondary,
  muted: '#9A9A9A',
  textMuted: '#B0B0B0',
  link: colors.brand,
  danger: '#C0392B',
  white: colors.white,
  backBtnBg: colors.primary50,
  radius: 12,
} as const;
