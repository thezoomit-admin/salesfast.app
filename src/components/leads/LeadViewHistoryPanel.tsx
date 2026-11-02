import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { formatViewDuration } from '@/features/leads/leadActivity';
import { leadViewsQuery } from '@/features/leads/leadsApi';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatDateTime } from '@/utils/dates';

type Props = { leadId: number };

export function LeadViewHistoryPanel({ leadId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query = useQuery(leadViewsQuery(leadId));

  if (query.isLoading && !query.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Could not load view history')}
      />
    );
  }

  const items = query.data?.items ?? [];
  const liveCount = query.data?.liveCount ?? 0;

  if (!items.length) {
    return (
      <EmptyState
        title="No views yet"
        message="When someone opens this lead, visits show up here."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.summary}>
        {query.data?.total ?? items.length} view
        {(query.data?.total ?? items.length) === 1 ? '' : 's'}
        {liveCount > 0 ? ` · ${liveCount} live` : ''}
      </Text>
      {items.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.name}>{v.userName?.trim() || 'Unknown user'}</Text>
            {v.isLive ? <Text style={styles.live}>Live</Text> : null}
          </View>
          <Text style={styles.meta}>
            {formatDateTime(v.viewedAt)} · {formatViewDuration(v.durationSeconds)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    loading: { paddingVertical: spacing.xl, alignItems: 'center' },
    summary: { ...typography.caption, color: colors.textMuted, marginBottom: 2 },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      gap: 4,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      alignItems: 'center',
    },
    name: { ...typography.body, fontWeight: '600', color: colors.text, flex: 1 },
    live: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    meta: { ...typography.caption, color: colors.textSecondary },
  });
}
