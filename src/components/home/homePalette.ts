import { inboxPalette } from '@/features/notifications/inboxPalette';

/**
 * The Home sections share the inbox's ink, cards and tints, with a purple accent
 * of their own. `link` is the inbox blue, for the see-all link and follow-up tags.
 */
export function homePalette(isDark: boolean) {
  const inbox = inboxPalette(isDark);
  return {
    ...inbox,
    accent: isDark ? '#A98BFF' : '#4A25D9',
    link: inbox.accent,
  };
}

export type HomePalette = ReturnType<typeof homePalette>;
