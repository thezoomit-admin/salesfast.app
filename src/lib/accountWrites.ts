import { useIsMutating } from '@tanstack/react-query';

import { AccountChangedError } from '@/api/client';

/** Offline writes (`meta.offline`) of this account not yet accepted by the server. */
export function usePendingWriteCount(accountId: string | undefined) {
  return useIsMutating({
    predicate: (m) =>
      m.meta?.offline === true &&
      (m.state.variables as { accountId?: string } | undefined)?.accountId ===
        accountId,
  });
}

/**
 * Writes queued by one account wait here while another account is active
 * (the API client refuses to send them — see AxiosRequestConfig.accountId).
 * They resume when their account is active again. Sign-out abandons them:
 * by then they are saved in that account's pending-writes file and are
 * restored at its next sign-in.
 */
const parked = new Set<{
  accountId: string;
  resume: () => void;
  abandon: (error: Error) => void;
}>();

export function resumeParkedWrites(accountId: string) {
  for (const entry of [...parked]) {
    if (entry.accountId === accountId) {
      parked.delete(entry);
      entry.resume();
    }
  }
}

export function abandonParkedWrites() {
  for (const entry of [...parked]) {
    parked.delete(entry);
    entry.abandon(new AccountChangedError());
  }
}

/** Runs `send` as `accountId`, waiting while a different account is active. */
export async function asAccount<T>(
  accountId: string,
  send: () => Promise<T>
): Promise<T> {
  for (;;) {
    try {
      return await send();
    } catch (error) {
      if (!(error instanceof AccountChangedError)) throw error;
      await new Promise<void>((resume, abandon) => {
        parked.add({ accountId, resume, abandon });
      });
    }
  }
}
