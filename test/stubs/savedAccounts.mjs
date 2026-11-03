// In-memory saved-account list (src/features/auth/savedAccounts).
export const saved = new Map();
export async function upsertSavedAccount({ user, accessToken, refreshToken }) {
  saved.set(String(user.id), { id: String(user.id), accessToken, refreshToken });
}
export async function getSavedAccount(id) {
  return saved.get(id) ?? null;
}
