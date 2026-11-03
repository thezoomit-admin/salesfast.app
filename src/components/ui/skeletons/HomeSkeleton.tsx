import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors home: focus → scoreboard → reports → queue → pipeline. */
export function HomeSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.focusCard}>
        <View style={styles.focusTop}>
          <SkeletonBone width={110} height={14} />
          <SkeletonBone width={36} height={36} radius={18} />
        </View>
        <View style={styles.focusBody}>
          <View style={styles.focusCopy}>
            <SkeletonBone width={64} height={36} radius={8} />
            <SkeletonBone width="80%" height={12} />
          </View>
          <View style={styles.focusBars}>
            {[28, 40, 22, 34].map((h, i) => (
              <SkeletonBone key={i} width={16} height={h} radius={8} />
            ))}
          </View>
        </View>
        <View style={styles.focusFooter}>
          <SkeletonBone width={72} height={26} radius={13} />
          <SkeletonBone width={72} height={12} />
        </View>
      </View>

      <View style={styles.scoreBoard}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.scoreCard}>
            <SkeletonBone width={32} height={32} radius={16} />
            <SkeletonBone width={56} height={24} />
            <SkeletonBone width={64} height={12} />
          </View>
        ))}
      </View>

      <ReportsSectionSkeleton styles={styles} />
      <QueueSectionSkeleton styles={styles} rows={3} />
      <PipelineSectionSkeleton styles={styles} rows={4} />
    </SkeletonPulse>
  );
}

function ReportsSectionSkeleton({
  styles,
}: {
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <SkeletonBone width={72} height={14} />
      </View>
      <View style={styles.reportList}>
        <View style={styles.reportCard}>
          <SkeletonBone width="45%" height={13} />
          <SkeletonBone width={72} height={28} />
          <SkeletonBone width="100%" height={10} radius={999} />
          <SkeletonBone width="70%" height={10} />
        </View>
        <View style={styles.reportCard}>
          <SkeletonBone width="40%" height={13} />
          <SkeletonBone width="100%" height={12} radius={6} />
          <SkeletonBone width="80%" height={14} />
          <SkeletonBone width="75%" height={14} />
        </View>
        <View style={styles.reportCard}>
          <SkeletonBone width="38%" height={13} />
          <View style={styles.reportPulse}>
            <View style={styles.reportPulseCopy}>
              <SkeletonBone width={64} height={28} />
              <SkeletonBone width="90%" height={10} />
            </View>
            <View style={styles.reportBars}>
              {[18, 28, 22, 36].map((h, i) => (
                <SkeletonBone key={i} width={14} height={h} radius={5} />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function QueueSectionSkeleton({
  styles,
  rows,
}: {
  styles: ReturnType<typeof createStyles>;
  rows: number;
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <SkeletonBone width={110} height={14} />
        <SkeletonBone width={72} height={12} />
      </View>
      <View style={styles.queueList}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.queueCard}>
            <SkeletonBone width={3} height={72} radius={0} />
            <View style={styles.queueCardBody}>
              <SkeletonBone width={72} height={44} radius={radii.sm} />
              <View style={styles.queueCopy}>
                <SkeletonBone width="58%" height={13} />
                <SkeletonBone width="42%" height={10} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PipelineSectionSkeleton({
  styles,
  rows,
}: {
  styles: ReturnType<typeof createStyles>;
  rows: number;
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
            <SkeletonBone width={36} height={36} radius={6} />
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
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 16,
    },
    focusTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    focusBody: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    focusCopy: { flex: 1, gap: 8 },
    focusBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 48,
    },
    focusFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scoreBoard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    scoreCard: {
      width: '48%',
      flexGrow: 1,
      minWidth: '46%',
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 10,
      minHeight: 118,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    reportList: { gap: 10 },
    reportCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    reportPulse: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    reportPulseCopy: { flex: 1, gap: 8 },
    reportBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      height: 48,
    },
    queueList: { gap: 8 },
    queueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
      minHeight: 72,
    },
    queueCardBody: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      minWidth: 0,
    },
    queueCopy: { flex: 1, gap: 6, minWidth: 0 },
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
