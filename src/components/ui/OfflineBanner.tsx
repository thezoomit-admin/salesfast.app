import { onlineManager } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthContext';
import { usePendingWriteCount } from '@/lib/accountWrites';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

/** Approximate bottom tab bar height, so the pill floats just above it. */
const TAB_BAR_OFFSET = 64;

/** Small floating notice while the API is unreachable; screens keep showing cached data. */
export function OfflineBanner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const online = useSyncExternalStore(
    onlineManager.subscribe.bind(onlineManager),
    () => onlineManager.isOnline()
  );
  const insets = useSafeAreaInsets();
  const waiting = usePendingWriteCount(useAuth().user?.id);
  if (online) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_OFFSET }]}
    >
      <View style={styles.pill} accessibilityLiveRegion="polite">
        <View style={styles.dot} />
        <Text style={styles.text}>
          {waiting > 0
            ? `Offline · ${waiting} change${waiting === 1 ? '' : 's'} waiting to sync`
            : 'Offline · showing saved data'}
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 20,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      // Invert page ink so the pill stays high-contrast in light and dark.
      backgroundColor: colors.text,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.warning,
    },
    text: { ...typography.caption, color: colors.background },
  });
}
