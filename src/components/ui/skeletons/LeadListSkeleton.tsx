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
          <View style={styles.body}>
            <View style={styles.topRow}>
              <SkeletonBone width="55%" height={16} />
              <SkeletonBone width={64} height={22} radius={6} />
            </View>
            <SkeletonBone width="42%" height={12} />
            <View style={styles.topRow}>
              <SkeletonBone width={92} height={24} radius={4} />
              <SkeletonBone width={60} height={11} />
            </View>
          </View>
          <View style={styles.footer}>
            <SkeletonBone width={64} height={13} />
            <View style={styles.actions}>
              <SkeletonBone width={20} height={20} radius={radii.pill} />
              <SkeletonBone width={20} height={20} radius={radii.pill} />
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
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    body: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actions: { flexDirection: 'row', gap: 14 },
  });
}
