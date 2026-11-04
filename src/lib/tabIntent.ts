import { useEffect } from 'react';

type IntentScreen = 'leads' | 'follow-ups';

export type TabIntent = { screen: IntentScreen; value: string };

const pending = new Map<IntentScreen, string>();
const listeners = new Map<IntentScreen, () => void>();

/**
 * One-shot request from Home to another tab, e.g. "open Unread". Call it just
 * before navigating. A route param would have to be cleared after use, or the
 * same shortcut would do nothing the second time, and clearing one only
 * reaches the focused route.
 */
export function requestTabIntent({ screen, value }: TabIntent) {
  pending.set(screen, value);
  listeners.get(screen)?.();
}

/** Runs `onIntent` (keep it stable) for requests made before or after mount. */
export function useTabIntent(
  screen: IntentScreen,
  onIntent: (value: string) => void
) {
  useEffect(() => {
    const consume = () => {
      const value = pending.get(screen);
      if (value === undefined) return;
      pending.delete(screen);
      onIntent(value);
    };
    consume();
    listeners.set(screen, consume);
    return () => {
      listeners.delete(screen);
    };
  }, [screen, onIntent]);
}
