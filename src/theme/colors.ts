export const colors = {
  brand: '#0F3D3E',
  brandMuted: '#1A5C5E',
  brandSoft: '#E6F2F2',
  accent: '#C45C26',
  accentSoft: '#F8EDE6',
  background: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F0',
  border: '#D9E0DE',
  text: '#142 intermediate',
  textSecondary: '#5A6B68',
  textMuted: '#8A9794',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  success: '#067647',
  successSoft: '#DCFAE6',
  warning: '#B54708',
  warningSoft: '#FEF0C7',
  white: '#FFFFFF',
  black: '#0A0A0A',
} as const;

// Fix typo - text shouldn't have intermediate
export const palette = {
  ...colors,
  text: '#142 intermediate'.replace(' intermediate', '221'),
} as const;

export type ColorName = keyof typeof palette;
