import type { CountryCode } from 'libphonenumber-js';

import { DIAL_CODES } from './dialCodes';

export type CountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

/**
 * Country → calling code, from a static table generated out of
 * libphonenumber-js metadata. Importing libphonenumber-js at runtime pulled
 * its whole parser/formatter (~460 KB of JS) into the bundle for this lookup.
 */
const dialCodes = new Map(
  DIAL_CODES.split(',').map((pair) => {
    const [code, dial] = pair.split(':');
    return [code as CountryCode, dial!] as const;
  })
);

/** ISO → flag emoji (regional indicators). */
function flagEmoji(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let regionNames: Intl.DisplayNames | null | undefined;

function countryName(code: string) {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  return regionNames?.of(code) ?? code;
}

function toOption(code: CountryCode): CountryOption {
  return {
    code,
    name: countryName(code),
    dialCode: dialCodes.get(code) ?? '',
    flag: flagEmoji(code),
  };
}

let countries: CountryOption[] | null = null;

/**
 * All supported countries, sorted by name. Built on first use (the country
 * picker), not at app start — route modules are all loaded at launch.
 */
export function listCountries(): CountryOption[] {
  countries ??= [...dialCodes.keys()]
    .map(toOption)
    .sort((a, b) => a.name.localeCompare(b.name));
  return countries;
}

export const DEFAULT_COUNTRY_CODE: CountryCode = 'BD';

export function findCountry(code: CountryCode): CountryOption {
  return toOption(dialCodes.has(code) ? code : DEFAULT_COUNTRY_CODE);
}

/** Build E.164 from dial code + national digits. */
export function toE164(dialCode: string, national: string) {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  return `+${dialCode}${digits}`;
}
