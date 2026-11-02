import { focusManager, onlineManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/config';

/**
 * React Query has no built-in network or focus signal on React Native.
 *
 * Focus: AppState → stale queries refresh when the app comes back to the
 * foreground, and polling (e.g. unread count) stops while it is backgrounded.
 *
 * Online: we have no NetInfo native module in the current build, so the API
 * client reports what it sees. A request that never reaches the server marks
 * us offline (queries pause and keep showing cached data); a cheap probe then
 * flips us back online, which resumes paused queries and refetches stale ones.
 */
const PROBE_INTERVAL_MS = 5_000;
const PROBE_TIMEOUT_MS = 4_000;

let probeTimer: ReturnType<typeof setInterval> | null = null;
let probing = false;

async function probe() {
  if (probing) return;
  probing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Any HTTP response (even 404) proves the API host is reachable.
    await fetch(API_BASE_URL, { method: 'HEAD', signal: controller.signal });
    reportReachable();
  } catch {
    // still offline
  } finally {
    clearTimeout(timeout);
    probing = false;
  }
}

function stopProbing() {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
}

/** The API answered (any status) — we are online. */
export function reportReachable() {
  stopProbing();
  if (!onlineManager.isOnline()) onlineManager.setOnline(true);
}

/** A request failed without any server response — treat as offline. */
export function reportUnreachable() {
  if (onlineManager.isOnline()) onlineManager.setOnline(false);
  probeTimer ??= setInterval(() => void probe(), PROBE_INTERVAL_MS);
}

let installed = false;

export function installConnectivityManagers() {
  if (installed || Platform.OS === 'web') return;
  installed = true;

  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => {
      setFocused(state === 'active');
      if (state === 'active' && !onlineManager.isOnline()) void probe();
    });
    return () => sub.remove();
  });
}
