import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors calls list rows under the sync toolbar. */
export function CallsSkeleton({ rows = 7 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.tabs}>
        {[72, 56, 64].map((w, i) => (
          <SkeletonBone
            key={i}
            width={w}
            height={32}
            radius={radii.md}
            style={styles.tab}
          />
        ))}
      </View>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBone width={40} height={40} radius={radii.pill} />
          <View style={styles.body}>
            <SkeletonBone width="52%" height={14} />
            <SkeletonBone width="38%" height={11} />
          </View>
          <View style={styles.meta}>
            <SkeletonBone width={48} height={11} />
            <SkeletonBone width={36} height={10} />
          </View>
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    tab: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    body: { flex: 1, gap: 6, minWidth: 0 },
    meta: { alignItems: 'flex-end', gap: 6 },
  });
}
