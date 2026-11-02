import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

import { Button } from './Button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

/** Hisab-style empty — soft brand icon + optional CTA. */
export function EmptyState({
  title,
  message,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  actionLabel?: string;
  onAction?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.emptyCaption}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.emptyBtn,
            pressed && styles.emptyBtnPressed,
          ]}
        >
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.caption}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try again"
          onPress={onRetry}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  );
}

/** Placeholder cards shown only on a true first load (nothing cached yet). */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.skeletonList, { opacity: pulse }]}
      accessibilityLabel="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={[styles.skeletonBar, { width: '55%' }]} />
          <View style={[styles.skeletonBar, styles.skeletonBarThin, { width: '35%' }]} />
          <View style={[styles.skeletonBar, styles.skeletonBarThin, { width: '70%' }]} />
        </View>
      ))}
    </Animated.View>
  );
}

/** No cached copy and no connection. */
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.center}>
      <Text style={styles.title}>You&apos;re offline</Text>
      <Text style={styles.caption}>
        This page hasn&apos;t been loaded on this device yet. It will load
        automatically when you&apos;re back online.
      </Text>
      {onRetry ? (
        <Button
          title="Try again"
          onPress={onRetry}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  );
}

/**
 * Picks the placeholder for a query that has no data yet: error, offline
 * (query paused waiting for network) or a page-specific skeleton.
 */
export function QueryPlaceholder({
  query,
  rows,
  errorMessage,
  skeleton,
}: {
  query: {
    isError: boolean;
    fetchStatus: string;
    refetch: () => unknown;
  };
  rows?: number;
  errorMessage: string;
  /** Prefer a layout-matched skeleton for each screen. */
  skeleton?: ReactNode;
}) {
  if (query.isError) {
    return <ErrorState message={errorMessage} onRetry={() => query.refetch()} />;
  }
  if (query.fetchStatus === 'paused') {
    return <OfflineState onRetry={() => query.refetch()} />;
  }
  return skeleton ?? <SkeletonList rows={rows} />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    skeletonList: { padding: spacing.lg, gap: spacing.md },
    skeletonCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    skeletonBar: {
      height: 14,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
    },
    skeletonBarThin: { height: 10 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    empty: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: colors.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
    caption: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyCaption: {
      ...typography.caption,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    emptyBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.brand,
      borderRadius: radii.sm,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    emptyBtnPressed: { opacity: 0.9 },
    emptyBtnText: {
      ...typography.subtitle,
      fontSize: 15,
      color: colors.white,
    },
  });
}
