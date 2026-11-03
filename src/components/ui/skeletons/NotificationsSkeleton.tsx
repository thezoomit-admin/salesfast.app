import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors Hisab-style notification list rows. */
export function NotificationsSkeleton({ rows = 6 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <SkeletonBone width={44} height={44} radius={radii.md} />
          <View style={styles.body}>
            <SkeletonBone width="68%" height={14} />
            <SkeletonBone width="92%" height={12} />
            <SkeletonBone width="80%" height={12} />
            <SkeletonBone width={120} height={10} style={styles.time} />
          </View>
          <View style={styles.dotSpacer} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: spacing.lg,
      paddingTop: 12,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.md,
    },
    body: { flex: 1, gap: 6, paddingRight: spacing.sm },
    time: { marginTop: 2 },
    dotSpacer: { width: 10 },
  });
}
