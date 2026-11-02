import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

import { Button } from './Button';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.caption}>{message}</Text> : null}
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
 * (query paused waiting for network) or skeleton.
 */
export function QueryPlaceholder({
  query,
  rows,
  errorMessage,
}: {
  query: {
    isError: boolean;
    fetchStatus: string;
    refetch: () => unknown;
  };
  rows?: number;
  errorMessage: string;
}) {
  if (query.isError) {
    return <ErrorState message={errorMessage} onRetry={() => query.refetch()} />;
  }
  if (query.fetchStatus === 'paused') {
    return <OfflineState onRetry={() => query.refetch()} />;
  }
  return <SkeletonList rows={rows} />;
}

const styles = StyleSheet.create({
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
  title: { ...typography.subtitle, color: colors.text, textAlign: 'center' },
  caption: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
