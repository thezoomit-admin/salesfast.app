import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors HomeDashboard: greeting → KPI → live → insights → leads → queue. */
export function HomeSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <SkeletonBone
        width="58%"
        height={22}
        radius={6}
        style={styles.onWash}
      />

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
        <SkeletonBone width={160} height={14} style={styles.onWash} />
        <SkeletonBone width={32} height={32} radius={16} style={styles.onWash} />
      </View>

      <View style={styles.liveCard}>
        <View style={styles.liveTop}>
          <SkeletonBone width={30} height={30} radius={15} />
          <SkeletonBone width={30} height={30} radius={15} />
        </View>
        <SkeletonBone width="70%" height={14} />
        <SkeletonBone width={88} height={12} />
        <View style={styles.liveBottom}>
          <View style={styles.liveCopy}>
            <SkeletonBone width="90%" height={11} />
            <SkeletonBone width="75%" height={11} />
          </View>
          <SkeletonBone width={72} height={72} radius={36} />
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
        <SkeletonBone width={110} height={14} style={styles.onWash} />
        <SkeletonBone width={32} height={32} radius={16} style={styles.onWash} />
      </View>

      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.leadCard}>
          <View style={styles.leadTop}>
            <SkeletonBone width="48%" height={14} />
            <SkeletonBone width={56} height={22} radius={6} />
          </View>
          <SkeletonBone width="62%" height={11} />
          <View style={styles.leadActions}>
            <SkeletonBone width={36} height={36} radius={18} />
            <SkeletonBone width={36} height={36} radius={18} />
            <SkeletonBone width={36} height={36} radius={18} />
          </View>
        </View>
      ))}

      <View style={styles.sectionHead}>
        <SkeletonBone width={150} height={14} style={styles.onWash} />
        <SkeletonBone width={72} height={12} style={styles.onWash} />
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
      paddingBottom: spacing.xxl,
    },
    /** Bones sitting on page wash — surfaceMuted blends into #EEF1F4. */
    onWash: {
      backgroundColor: colors.border,
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 12,
    },
    kpiCard: {
      flex: 1,
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
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 8,
      minHeight: 168,
    },
    liveTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    liveBottom: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 4,
    },
    liveCopy: { flex: 1, gap: 6 },
    insightCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    leadCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 10,
    },
    leadTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    leadActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    upcomingCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
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
