import { blue, type ThemeColors } from '@/theme';

/**
 * Lead Details colours (the blue-header mockup). Light mode uses the
 * mockup's navy ink and blue-grey sheet; dark mode falls back to the theme.
 */
export function leadDetailPalette(colors: ThemeColors, isDark: boolean) {
  return {
    /** Header band, and behind the sheet's rounded corners. */
    header: isDark ? '#08327B' : blue[600],
    /** Page behind the cards. */
    sheet: isDark ? colors.background : '#F3F6FB',
    card: colors.surface,
    cardBorder: isDark ? colors.border : '#E8EDF5',
    divider: isDark ? colors.border : '#E6EBF2',
    /** Headings, names, dates. */
    ink: isDark ? colors.text : '#13203D',
    /** Body text: phone, labels. */
    body: isDark ? colors.textSecondary : '#4A5468',
    muted: isDark ? colors.textMuted : '#8C95A8',
    /** Avatar disc, icon tiles. */
    soft: isDark ? colors.primary50 : blue[100],
    /** Inactive tab pill, profile summary box. */
    tint: isDark ? colors.surfaceMuted : '#F1F4F9',
    /** Pipeline track and future-step rings. */
    track: isDark ? '#2F3640' : '#E1E6EE',
    ring: isDark ? '#3A424D' : '#D5DBE4',
  };
}

export type LeadDetailPalette = ReturnType<typeof leadDetailPalette>;

/** Soft card shadow from the mockup (light mode only). */
export function cardShadow(isDark: boolean) {
  return isDark
    ? {}
    : {
        shadowColor: '#1B2A4A',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      };
}
