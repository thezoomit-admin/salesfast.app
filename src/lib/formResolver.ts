import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';

/** Field → error message for each failing field (omit or leave empty when valid). */
export type FormCheck<T> = (values: T) => Partial<Record<keyof T, string | false>>;

/**
 * Minimal react-hook-form resolver for the app's small forms. Replaces zod +
 * @hookform/resolvers, whose package roots pulled ~1 MB of JS (every zod
 * locale) into the release bundle for a handful of length checks.
 *
 * Checks run in order; the first message per field wins.
 */
export function formResolver<T extends FieldValues>(
  ...checks: FormCheck<T>[]
): Resolver<T> {
  return async (values) => {
    const errors: Record<string, { type: string; message: string }> = {};
    for (const check of checks) {
      // Like zod's object-level refine: later checks only run on valid fields.
      if (checks.indexOf(check) > 0 && Object.keys(errors).length) break;
      for (const [field, message] of Object.entries(check(values))) {
        if (message && !errors[field]) errors[field] = { type: 'validate', message };
      }
    }
    return Object.keys(errors).length
      ? { values: {}, errors: errors as FieldErrors<T> }
      : { values, errors: {} };
  };
}

/** Message when `value` is shorter than `min` characters. */
export const minLength = (value: string | undefined, min: number, message: string) =>
  (value ?? '').length < min ? message : false;
