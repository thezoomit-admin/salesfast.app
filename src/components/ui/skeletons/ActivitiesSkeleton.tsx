import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors a day panel of activity rows. */
export function ActivitiesSkeleton({ rows = 5 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.panel}>
        <SkeletonBone width="30%" height={16} />
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.row}>
            <SkeletonBone width={36} height={36} radius={18} />
            <View style={styles.content}>
              <View style={styles.top}>
                <SkeletonBone width="48%" height={14} />
                <SkeletonBone width={48} height={10} />
              </View>
              <SkeletonBone width="92%" height={12} />
              <SkeletonBone width={76} height={20} radius={10} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { paddingHorizontal: spacing.lg },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      gap: 18,
    },
    row: { flexDirection: 'row', gap: 12 },
    content: { flex: 1, gap: 8 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });
}
