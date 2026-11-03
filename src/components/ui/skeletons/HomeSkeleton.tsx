import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors Testora-style home: greeting → CTA → KPI grid → live → insights → queue. */
export function HomeSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.greeting}>
        <SkeletonBone width="55%" height={24} />
        <SkeletonBone width="40%" height={12} />
      </View>

      <SkeletonBone width="100%" height={48} radius={radii.pill} />

      <View style={styles.kpiRow}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <SkeletonBone width={72} height={12} />
              <SkeletonBone width={34} height={34} radius={17} />
            </View>
            <View style={styles.kpiBottom}>
              <SkeletonBone width={36} height={24} />
              <SkeletonBone width={56} height={12} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionHead}>
        <SkeletonBone width={140} height={14} />
        <SkeletonBone width={56} height={12} />
      </View>

      <View style={styles.liveCard}>
        <SkeletonBone width={92} height={92} radius={46} />
        <View style={styles.liveCopy}>
          <SkeletonBone width={80} height={10} />
          <SkeletonBone width="90%" height={16} />
          <SkeletonBone width="70%" height={12} />
          <SkeletonBone width={96} height={24} radius={12} />
        </View>
      </View>

      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.insightCard}>
          <SkeletonBone width="50%" height={14} />
          <SkeletonBone width="100%" height={40} radius={8} />
          <SkeletonBone width="100%" height={8} radius={999} />
        </View>
      ))}

      <View style={styles.sectionHead}>
        <SkeletonBone width={150} height={14} />
        <SkeletonBone width={72} height={12} />
      </View>

      <View style={styles.upcomingCard}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.upcomingRow, i > 0 && styles.upcomingDivider]}
          >
            <View style={styles.upcomingCopy}>
              <SkeletonBone width="55%" height={13} />
              <SkeletonBone width="40%" height={10} />
            </View>
            <SkeletonBone width={48} height={24} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      gap: 14,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    greeting: { gap: 6 },
    kpiRow: {
      flexDirection: 'row',
      gap: 12,
    },
    kpiCard: {
      width: 168,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 18,
      minHeight: 108,
      justifyContent: 'space-between',
    },
    kpiTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    kpiBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    liveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
    },
    liveCopy: { flex: 1, gap: 8 },
    insightCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    upcomingCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    upcomingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingVertical: 12,
    },
    upcomingDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    upcomingCopy: { flex: 1, gap: 6 },
  });
}
