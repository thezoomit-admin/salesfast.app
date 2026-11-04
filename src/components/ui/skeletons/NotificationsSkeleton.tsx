import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useThemeColors, type ThemeColors } from '@/theme';

import { SkeletonBone, SkeletonPulse } from './primitives';

/** Mirrors the notification inbox rows. */
export function NotificationsSkeleton({ rows = 7 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SkeletonPulse style={styles.root}>
      <SkeletonBone width={64} height={10} style={styles.section} />
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.row}>
          <SkeletonBone width={40} height={40} radius={20} />
          <View style={styles.body}>
            <SkeletonBone width="72%" height={13} />
            <SkeletonBone width="54%" height={10} />
          </View>
          <SkeletonBone width={48} height={10} />
        </View>
      ))}
    </SkeletonPulse>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      paddingHorizontal: spacing.lg,
    },
    section: { marginTop: spacing.lg, marginBottom: spacing.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    body: { flex: 1, gap: spacing.sm },
  });
}
