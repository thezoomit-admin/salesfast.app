import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { inboxPalette, type InboxPalette } from '@/features/notifications/inboxPalette';
import { spacing, useTheme } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors the notification inbox cards. */
export function NotificationsSkeleton({ rows = 7 }: { rows?: number }) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <SkeletonPulse style={styles.root}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBone width={42} height={42} radius={21} />
          <View style={styles.body}>
            <SkeletonBone width="72%" height={13} />
            <SkeletonBone width="54%" height={10} />
          </View>
          <SkeletonBone width={52} height={20} radius={10} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: 12,
      paddingTop: spacing.sm,
      gap: 5,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: 7,
      paddingHorizontal: 12,
      gap: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
    },
    body: { flex: 1, gap: spacing.sm },
  });
}
