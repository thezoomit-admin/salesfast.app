import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors LeadListItemCard rows (leads + follow-ups). */
export function LeadListSkeleton({ rows = 6 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.main}>
              <SkeletonBone width="62%" height={15} />
              <SkeletonBone width="42%" height={12} />
            </View>
            <SkeletonBone width={72} height={24} radius={radii.pill} />
          </View>
          <View style={styles.footer}>
            <View style={styles.footerMeta}>
              <SkeletonBone width={48} height={22} radius={radii.pill} />
              <SkeletonBone width="45%" height={11} />
            </View>
            <View style={styles.actions}>
              <SkeletonBone width={34} height={34} radius={radii.pill} />
              <SkeletonBone width={34} height={34} radius={radii.pill} />
            </View>
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
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    main: { flex: 1, gap: 8, minWidth: 0 },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    footerMeta: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    actions: { flexDirection: 'row', gap: spacing.sm },
  });
}
