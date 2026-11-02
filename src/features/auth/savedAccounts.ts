import { secureStorage } from '@/services/secureStorage';
import type { AuthUser } from '@/types/api';

export type SavedMobileAccount = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  accessToken: string;
  refreshToken: string;
  lastUsedAt: string;
  signedOut?: boolean;
};

async function loadAccounts(): Promise<SavedMobileAccount[]> {
  const raw = await secureStorage.getAccountsJson();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedMobileAccount[];
    return Array.isArray(parsed) ? parsed.filter((a) => a?.id) : [];
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: SavedMobileAccount[]) {
  await secureStorage.setAccountsJson(JSON.stringify(accounts));
}

export async function listSavedAccounts(): Promise<SavedMobileAccount[]> {
  const list = await loadAccounts();
  return [...list].sort(
    (a, b) =>
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  );
}

export async function upsertSavedAccount(input: {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}) {
  const list = await loadAccounts();
  const next: SavedMobileAccount = {
    id: String(input.user.id),
    name: input.user.name,
    email: input.user.email,
    phone: input.user.phone,
    role: input.user.role,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    lastUsedAt: new Date().toISOString(),
    signedOut: false,
  };
  const without = list.filter((a) => a.id !== next.id);
  await saveAccounts([next, ...without]);
}

export async function markAccountSignedOut(accountId: string) {
  const list = await loadAccounts();
  await saveAccounts(
    list.map((a) =>
      a.id === accountId
        ? { ...a, signedOut: true, accessToken: '', refreshToken: '' }
        : a
    )
  );
}

export async function removeSavedAccount(accountId: string) {
  const list = await loadAccounts();
  await saveAccounts(list.filter((a) => a.id !== accountId));
}

export async function getSavedAccount(accountId: string) {
  const list = await loadAccounts();
  return list.find((a) => a.id === accountId) ?? null;
}
