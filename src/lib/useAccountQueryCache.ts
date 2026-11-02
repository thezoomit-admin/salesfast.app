import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { abandonParkedWrites, resumeParkedWrites } from './accountWrites';
import {
  persistQueryCache,
  restorePendingWrites,
  restoreQueryCache,
} from './queryPersistence';

/** Never hold the splash longer than this waiting for the disk cache. */
const RESTORE_TIMEOUT_MS = 1_500;

/**
 * Ties the React Query cache to the signed-in account:
 * - account switch → wipe the previous account's data from memory
 *   (reset keeps mounted screens subscribed and refetches with the new token);
 * - sign-out → clear memory;
 * - sign-in / launch → load this account's disk cache, then keep it saved.
 *
 * Unsent offline writes follow the account too: they keep waiting (in memory
 * and on disk) while another account is active, and are reloaded and resumed
 * when their account signs in again.
 *
 * Returns true while the disk cache is still being restored.
 */
export function useAccountQueryCache(
  userId: string | null,
  bootstrapping: boolean
) {
  const client = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const [restoredFor, setRestoredFor] = useState<string | null>(null);

  useEffect(() => {
    if (bootstrapping) return;

    const previous = previousUser.current;
    previousUser.current = userId;
    if (previous && previous !== userId) {
      if (userId) void client.resetQueries();
      else {
        // Signed out: the account's unsent writes were saved to disk when
        // its persister stopped; drop the in-memory copies.
        abandonParkedWrites();
        client.clear();
      }
    }
    if (!userId) return;

    let cancelled = false;
    let stopPersisting: (() => void) | null = null;
    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, RESTORE_TIMEOUT_MS)
    );
    void Promise.race([restoreQueryCache(client, userId), timeout]).then(() => {
      if (cancelled) return;
      stopPersisting = persistQueryCache(client, userId);
      setRestoredFor(userId);
      // After the persister is running, so resumed writes stay saved.
      void restorePendingWrites(client, userId).then(() => {
        if (!cancelled) resumeParkedWrites(userId);
      });
    });

    return () => {
      cancelled = true;
      stopPersisting?.();
    };
  }, [userId, bootstrapping, client]);

  return bootstrapping || (userId !== null && restoredFor !== userId);
}
