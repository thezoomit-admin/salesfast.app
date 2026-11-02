import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/StateViews';
import {
  callBody,
  callKind,
  callNotesOf,
  type CallKind,
} from '@/features/leads/leadActivity';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';
import { formatDateTime } from '@/utils/dates';

type Props = { lead: LeadDetail };

const KIND_LABEL: Record<CallKind, string> = {
  incoming: 'Incoming',
  outgoing: 'Outgoing',
  missed: 'Missed',
  failed: 'Failed',
};

export function LeadCallHistoryPanel({ lead }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const calls = useMemo(() => callNotesOf(lead), [lead]);

  if (!calls.length) {
    return (
      <EmptyState
        title="No calls yet"
        message="Synced call logs and call notes will appear here."
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {calls.map((n) => {
        const kind = callKind(n.note);
        const body = callBody(n.note);
        return (
          <View key={n.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={[styles.kind, kindStyle(kind, colors)]}>
                {KIND_LABEL[kind]}
              </Text>
              <Text style={styles.time}>{formatDateTime(n.createdAt)}</Text>
            </View>
            <Text style={styles.headline}>{body.headline}</Text>
            {body.duration ? (
              <Text style={styles.meta}>{body.duration}</Text>
            ) : null}
            <Text style={styles.by}>
              by {n.addedByName?.trim() || 'Agent'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function kindStyle(kind: CallKind, colors: ThemeColors) {
  if (kind === 'incoming') return { color: colors.brand };
  if (kind === 'outgoing') return { color: colors.success };
  if (kind === 'missed') return { color: colors.danger };
  return { color: colors.warning };
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
    },
    kind: { ...typography.caption, fontWeight: '700', textTransform: 'uppercase' },
    time: { ...typography.caption, color: colors.textMuted },
    headline: { ...typography.body, color: colors.text, fontWeight: '500' },
    meta: { ...typography.caption, color: colors.textSecondary },
    by: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  });
}
