import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/StateViews';
import { buildHistoryEvents } from '@/features/leads/leadActivity';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';
import { formatDateTime } from '@/utils/dates';

type Props = { lead: LeadDetail };

export function LeadHistoryPanel({ lead }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const events = useMemo(() => buildHistoryEvents(lead), [lead]);

  if (!events.length) {
    return (
      <EmptyState
        title="No history yet"
        message="Notes and status changes will show up here."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {events.map((e) => (
        <View key={e.key} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{e.title}</Text>
            <Text style={styles.time}>{formatDateTime(e.date)}</Text>
          </View>
          {e.meta ? <Text style={styles.meta}>{e.meta}</Text> : null}
          {e.body?.trim() ? (
            <Text style={styles.body}>{e.body.trim()}</Text>
          ) : null}
          <Text style={styles.by}>by {e.by?.trim() || 'System'}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
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
      alignItems: 'flex-start',
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    time: { ...typography.caption, color: colors.textMuted },
    meta: { ...typography.caption, color: colors.brand, fontWeight: '500' },
    body: { ...typography.body, color: colors.textSecondary },
    by: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  });
}
