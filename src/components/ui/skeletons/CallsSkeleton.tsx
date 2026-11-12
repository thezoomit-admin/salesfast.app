import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  inboxPalette,
  type InboxPalette,
} from '@/features/notifications/inboxPalette';
import { spacing, useTheme } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors the call cards on the Calls sheet, under its tab track. */
export function CallsSkeleton({ rows = 7 }: { rows?: number }) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <SkeletonPulse style={styles.root}>
      <SkeletonBone width={64} height={11} style={styles.day} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBone width={41} height={41} radius={21} />
          <View style={styles.body}>
            <SkeletonBone width="62%" height={13} />
            <SkeletonBone width="40%" height={10} />
            <SkeletonBone width="34%" height={10} />
          </View>
          <SkeletonBone width={58} height={20} radius={10} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: 12,
      paddingTop: spacing.xs,
      gap: 5,
    },
    day: { marginLeft: 4, marginTop: 4, marginBottom: 4 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 53,
      paddingVertical: 7,
      paddingHorizontal: 12,
      gap: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
    },
    body: { flex: 1, gap: 6 },
  });
}
