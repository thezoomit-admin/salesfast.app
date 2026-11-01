import { Linking } from 'react-native';

export function digitsOnly(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

export function formatPhoneDisplay(value?: string | null) {
  const digits = digitsOnly(value);
  if (!digits) return '—';
  if (digits.length === 11 && digits.startsWith('01')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('880')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return value || digits;
}

export async function openPhoneDialer(phone?: string | null) {
  const digits = digitsOnly(phone);
  if (!digits) return false;
  const url = `tel:${digits}`;
  const can = await Linking.canOpenURL(url);
  if (!can) return false;
  await Linking.openURL(url);
  return true;
}

export async function openWhatsApp(phone?: string | null) {
  let digits = digitsOnly(phone);
  if (!digits) return false;
  if (digits.startsWith('0') && digits.length === 11) {
    digits = `88${digits}`;
  } else if (!digits.startsWith('880') && digits.length === 10) {
    digits = `880${digits}`;
  }
  const url = `https://wa.me/${digits}`;
  await Linking.openURL(url);
  return true;
}
