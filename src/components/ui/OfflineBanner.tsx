import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/theme';

/** Approximate bottom tab bar height, so the pill floats just above it. */
const TAB_BAR_OFFSET = 64;

/** Small floating notice while the API is unreachable; screens keep showing cached data. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    onlineManager.subscribe.bind(onlineManager),
    () => onlineManager.isOnline()
  );
  const insets = useSafeAreaInsets();
  if (online) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_OFFSET }]}
    >
      <View style={styles.pill} accessibilityLiveRegion="polite">
        <View style={styles.dot} />
        <Text style={styles.text}>Offline · showing saved data</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  text: { ...typography.caption, color: colors.white },
});
