import { TextStyle } from 'react-native';

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  } satisfies TextStyle,
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '500',
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;
