import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors notification list rows. */
export function NotificationsSkeleton({ rows = 6 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBone width={36} height={36} radius={radii.pill} />
          <View style={styles.body}>
            <SkeletonBone width="58%" height={14} />
            <SkeletonBone width="92%" height={12} />
            <SkeletonBone width="70%" height={12} />
            <SkeletonBone width={72} height={10} style={styles.time} />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    body: { flex: 1, gap: 6 },
    time: { marginTop: 2 },
  });
}
