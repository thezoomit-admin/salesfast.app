import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors lead detail: hero → action rows → details panel → notes. */
export function LeadDetailSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.hero}>
        <SkeletonBone width="55%" height={22} />
        <SkeletonBone width="40%" height={14} />
        <SkeletonBone width="48%" height={12} />
      </View>

      <View style={styles.actions}>
        <SkeletonBone height={48} radius={radii.md} style={styles.actionBtn} />
        <SkeletonBone height={48} radius={radii.md} style={styles.actionBtn} />
      </View>
      <View style={styles.actions}>
        <SkeletonBone height={48} radius={radii.md} style={styles.actionBtn} />
        <SkeletonBone height={48} radius={radii.md} style={styles.actionBtn} />
      </View>

      <View style={styles.panel}>
        <SkeletonBone width={72} height={14} style={styles.panelTitle} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBone width={88} height={11} />
            <SkeletonBone width="42%" height={12} />
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <SkeletonBone width={120} height={14} style={styles.panelTitle} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.note}>
            <SkeletonBone width="55%" height={10} />
            <SkeletonBone width="95%" height={12} />
            <SkeletonBone width="80%" height={12} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

/**
 * One detail-only section (profile, requirements, history, calls) while the
 * screen shows just the tapped list row and the full record is loading.
 */
export function LeadSectionSkeleton({ rows = 4 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.panel}>
      <SkeletonBone width={96} height={14} style={styles.panelTitle} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.detailRow}>
          <SkeletonBone width={88} height={11} />
          <SkeletonBone width="42%" height={12} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    hero: {
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionBtn: { flex: 1 },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    panelTitle: { marginBottom: 4 },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    note: { gap: 8, paddingVertical: 4 },
  });
}
