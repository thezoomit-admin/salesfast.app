import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js';

export type CountryOption = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
};

/** ISO → flag emoji (regional indicators). */
function flagEmoji(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

function countryName(code: string) {
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/** All libphonenumber-supported countries, sorted by name. */
export const COUNTRIES: CountryOption[] = getCountries()
  .map((code) => ({
    code,
    name: countryName(code),
    dialCode: getCountryCallingCode(code),
    flag: flagEmoji(code),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY_CODE: CountryCode = 'BD';

export function findCountry(code: CountryCode): CountryOption {
  return (
    COUNTRIES.find((c) => c.code === code) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!
  );
}

/** Build E.164 from dial code + national digits. */
export function toE164(dialCode: string, national: string) {
  const digits = national.replace(/\D/g, '');
  if (!digits) return '';
  return `+${dialCode}${digits}`;
}
