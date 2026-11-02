import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors home: focus card → scoreboard → queue rows → pipeline rows. */
export function HomeSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.focusCard}>
        <View style={styles.focusTop}>
          <SkeletonBone width={96} height={10} />
          <SkeletonBone width={56} height={22} radius={radii.sm} />
        </View>
        <SkeletonBone width={72} height={40} radius={8} style={styles.focusValue} />
        <SkeletonBone width="70%" height={12} style={styles.focusHint} />
        <View style={styles.focusSplit}>
          <View style={styles.focusSplitItem}>
            <SkeletonBone width={40} height={18} />
            <SkeletonBone width={64} height={10} />
          </View>
          <View style={styles.focusSplitRule} />
          <View style={styles.focusSplitItem}>
            <SkeletonBone width={40} height={18} />
            <SkeletonBone width={56} height={10} />
          </View>
        </View>
      </View>

      <View style={styles.scoreBoard}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.scoreCol, i > 0 && styles.scoreColBorder]}
          >
            <SkeletonBone width={16} height={16} radius={8} />
            <SkeletonBone width={36} height={20} />
            <SkeletonBone width={48} height={10} />
          </View>
        ))}
      </View>

      <SectionSkeleton styles={styles} rows={3} withAvatar={false} />
      <SectionSkeleton styles={styles} rows={4} withAvatar />
    </SkeletonPulse>
  );
}

function SectionSkeleton({
  styles,
  rows,
  withAvatar,
}: {
  styles: ReturnType<typeof createStyles>;
  rows: number;
  withAvatar: boolean;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <SkeletonBone width={110} height={14} />
        <SkeletonBone width={72} height={12} />
      </View>
      <View style={styles.panel}>
        {Array.from({ length: rows }, (_, i) => (
          <View
            key={i}
            style={[styles.row, i > 0 && styles.rowDivider]}
          >
            {withAvatar ? (
              <SkeletonBone width={36} height={36} radius={6} />
            ) : (
              <SkeletonBone width={68} height={40} radius={6} />
            )}
            <View style={styles.rowCopy}>
              <SkeletonBone width="55%" height={13} />
              <SkeletonBone width="40%" height={10} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 16,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    focusCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 16,
    },
    focusTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    focusValue: { marginBottom: 8 },
    focusHint: { marginBottom: 14 },
    focusSplit: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    focusSplitItem: { flex: 1, gap: 6 },
    focusSplitRule: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: colors.border,
      marginHorizontal: 14,
    },
    scoreBoard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    scoreCol: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 6,
    },
    scoreColBorder: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowCopy: { flex: 1, gap: 6, minWidth: 0 },
  });
}
