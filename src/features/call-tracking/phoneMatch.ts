import { digitsOnly } from '@/utils/phone';

/** Last-10 digit key — matches BD local / +880 forms. */
export function phoneMatchKey(raw?: string | null): string | null {
  const digits = digitsOnly(raw);
  if (digits.length < 7) return null;
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}
