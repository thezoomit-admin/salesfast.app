import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors HomeDashboard: quick access → performance. */
export function HomeSkeleton() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <View style={styles.section}>
        <SkeletonBone width={120} height={14} />
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.chip}>
              <SkeletonBone width={24} height={24} radius={12} />
              <SkeletonBone width="50%" height={11} />
            </View>
          ))}
        </View>
        <View style={styles.row}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.card}>
              <SkeletonBone width={26} height={26} radius={8} />
              <SkeletonBone width="70%" height={11} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SkeletonBone width={140} height={14} />
        <SkeletonBone width="100%" height={176} radius={16} />
      </View>
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { gap: 24 },
    section: { gap: 12 },
    row: { flexDirection: 'row', gap: 10 },
    chip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card: {
      flex: 1,
      minHeight: 84,
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
