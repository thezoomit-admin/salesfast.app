import { onlineManager, type QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Alert } from 'react-native';

import { AccountChangedError, getErrorMessage } from '@/api/client';
import { asAccount } from '@/lib/accountWrites';

import { addLeadNote, fetchLeadById, updateLeadStatus } from './leadsApi';

/**
 * Lead writes that survive a dead connection or an app restart.
 *
 * - Offline (or the request never reached the server): the write is kept,
 *   saved to disk with the account's cache (see queryPersistence), and sent
 *   when the API is reachable again — also after a restart.
 * - Each write carries the account that made it and is only ever sent with
 *   that account's token; while another account is active it waits.
 * - Replays are safe: notes carry an Idempotency-Key (the server returns the
 *   note it already created), and a status change carries the lead version,
 *   so a replay of a change that already landed is recognised (see below).
 * - Writes of one account run one at a time, in the order they were made.
 */

export const LEAD_WRITE_KEY = 'lead-write';
export const ADD_NOTE_MUTATION = [LEAD_WRITE_KEY, 'add-note'] as const;
export const UPDATE_STATUS_MUTATION = [LEAD_WRITE_KEY, 'status'] as const;

type LeadWrite = {
  /** Account (user id) that made the change — never sent as anyone else. */
  accountId: string;
  leadId: number;
  /** Unique per write; doubles as the note's Idempotency-Key. */
  clientId: string;
  queuedAt: number;
};

export type AddNoteVars = LeadWrite & {
  note: string;
  channelId?: number;
  followupAt?: string;
  followupDate?: string;
  followupType?: string;
};

export type UpdateStatusVars = LeadWrite & {
  leadStatusId: number;
  expectedVersion?: number;
};

export type AnyLeadWrite = AddNoteVars | UpdateStatusVars;

export function newLeadWrite(accountId: string, leadId: number): LeadWrite {
  return {
    accountId,
    leadId,
    clientId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
    queuedAt: Date.now(),
  };
}

/**
 * Calls `onQueued` once if this write has to wait for the network (already
 * offline, or its request failed without reaching the server). Call it right
 * before `mutate`; it stops listening once the write settles.
 */
export function onWriteQueued(
  client: QueryClient,
  clientId: string,
  onQueued: () => void
) {
  if (!onlineManager.isOnline()) {
    onQueued();
    return;
  }
  const unsubscribe = client.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const vars = event.mutation.state.variables as AnyLeadWrite | undefined;
    if (vars?.clientId !== clientId) return;
    if (event.action.type === 'pause') {
      unsubscribe();
      onQueued();
    } else if (event.mutation.state.status !== 'pending') {
      unsubscribe();
    }
  });
}

/** Per-account queue: one account's stuck write never blocks another's. */
export function leadWriteScope(accountId: string) {
  return { id: `${LEAD_WRITE_KEY}:${accountId}` };
}

class StatusConflictError extends Error {}

/** Never reached the server, or a server-side hiccup worth repeating. */
function isTransient(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

const MAX_SERVER_ERROR_ATTEMPTS = 6;

const retry = (failureCount: number, error: unknown) => {
  if (!isTransient(error)) return false;
  // No response at all: the client is marked offline and the retry waits for
  // the connection, so keep going. Server errors give up eventually.
  if (axios.isAxiosError(error) && !error.response) return true;
  return failureCount < MAX_SERVER_ERROR_ATTEMPTS;
};

const retryDelay = (attempt: number) =>
  Math.min(60_000, 1_000 * 2 ** attempt) + Math.random() * 500;

function refreshAfterWrite(client: QueryClient, leadId: number, writeCount: number) {
  // Another write for this lead is still queued — a refetch now would only be
  // overwritten again; the last one refreshes.
  if (writeCount > 0) return;
  void client.invalidateQueries({ queryKey: ['lead', leadId] });
  void client.invalidateQueries({ queryKey: ['my-leads'] });
  void client.invalidateQueries({ queryKey: ['mobile-dashboard'] });
  void client.invalidateQueries({ queryKey: ['my-follow-ups'] });
}

function pendingWritesFor(client: QueryClient, leadId: number) {
  return client
    .getMutationCache()
    .findAll({ mutationKey: [LEAD_WRITE_KEY], status: 'pending' })
    .filter((m) => (m.state.variables as AnyLeadWrite | undefined)?.leadId === leadId)
    .length;
}

function reportFailure(title: string, error: unknown) {
  if (error instanceof AccountChangedError) return;
  Alert.alert(title, getErrorMessage(error));
}

/**
 * Registers how each lead write runs. Must be installed before the saved
 * queue is restored, so restored writes know their mutationFn.
 */
export function installLeadWriteDefaults(client: QueryClient) {
  client.setMutationDefaults(ADD_NOTE_MUTATION, {
    networkMode: 'online',
    meta: { offline: true },
    retry,
    retryDelay,
    mutationFn: (vars: AddNoteVars) =>
      asAccount(vars.accountId, () =>
        addLeadNote(
          vars.leadId,
          {
            note: vars.note,
            channelId: vars.channelId,
            followupAt: vars.followupAt,
            followupDate: vars.followupDate,
            followupType: vars.followupType,
          },
          { accountId: vars.accountId, idempotencyKey: vars.clientId }
        )
      ),
    onSettled: (_data, error, vars: AddNoteVars) => {
      if (error instanceof AccountChangedError) return;
      refreshAfterWrite(client, vars.leadId, pendingWritesFor(client, vars.leadId) - 1);
    },
    onError: (error) => reportFailure('Could not save note', error),
  });

  client.setMutationDefaults(UPDATE_STATUS_MUTATION, {
    networkMode: 'online',
    meta: { offline: true },
    retry,
    retryDelay,
    mutationFn: (vars: UpdateStatusVars) =>
      asAccount(vars.accountId, async () => {
        try {
          return await updateLeadStatus(
            vars.leadId,
            { leadStatusId: vars.leadStatusId, expectedVersion: vars.expectedVersion },
            { accountId: vars.accountId }
          );
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 409) throw error;
          // Stale version: either our own earlier attempt already landed (its
          // response was lost), or someone else changed the lead meanwhile.
          const current = await fetchLeadById(vars.leadId, { accountId: vars.accountId });
          if (current.leadStatus?.id === vars.leadStatusId) return current;
          throw new StatusConflictError(
            'This lead was changed by someone else, so your status change was not applied. Check the lead and try again.'
          );
        }
      }),
    onSettled: (_data, error, vars: UpdateStatusVars) => {
      if (error instanceof AccountChangedError) return;
      refreshAfterWrite(client, vars.leadId, pendingWritesFor(client, vars.leadId) - 1);
    },
    onError: (error) => reportFailure('Could not update status', error),
  });
}
