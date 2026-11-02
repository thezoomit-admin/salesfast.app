import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors activity note cards. */
export function ActivitiesSkeleton({ rows = 5 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.row}>
            <SkeletonBone width="48%" height={14} />
            <SkeletonBone width={56} height={12} />
          </View>
          <SkeletonBone width="92%" height={12} />
          <SkeletonBone width="70%" height={12} />
          <SkeletonBone width="40%" height={10} style={styles.meta} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    meta: { marginTop: 4 },
  });
}
