import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DayGroupHeader,
  LeadSectionShell,
} from '@/components/leads/LeadSectionShell';
import { EmptyState } from '@/components/ui/StateViews';
import { groupByDay, timeOf } from '@/features/leads/dayGroups';
import { buildHistoryEvents } from '@/features/leads/leadActivity';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';

type Props = { lead: LeadDetail };
type HistoryPill = 'activity' | 'journey';

export function LeadHistoryPanel({ lead }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pill, setPill] = useState<HistoryPill>('activity');
  const events = useMemo(() => buildHistoryEvents(lead), [lead]);
  const statusCount = useMemo(
    () => events.filter((e) => e.kind === 'status').length,
    [events]
  );
  const filtered =
    pill === 'journey' ? events.filter((e) => e.kind === 'status') : events;
  const groups = useMemo(
    () => groupByDay(filtered, (e) => e.date),
    [filtered]
  );

  return (
    <LeadSectionShell
      pills={[
        { key: 'journey', label: 'Journey', count: statusCount },
        { key: 'activity', label: 'Activity', count: events.length },
      ]}
      activeKey={pill}
      onPillChange={(k) => setPill(k as HistoryPill)}
    >
      {!filtered.length ? (
        <EmptyState
          title="No history yet"
          message={
            pill === 'journey'
              ? 'Status changes will show up here.'
              : 'Notes and status changes will show up here.'
          }
        />
      ) : (
        groups.map((g) => (
          <View key={g.key}>
            <DayGroupHeader label={g.label} />
            {g.items.map((e) => (
              <View key={e.key} style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        e.kind === 'status' ? colors.brand : colors.accentSoft,
                    },
                  ]}
                />
                <View style={styles.card}>
                  <View style={styles.header}>
                    <Text style={styles.title}>{e.title}</Text>
                    <Text style={styles.time}>{timeOf(e.date)}</Text>
                  </View>
                  {e.meta ? <Text style={styles.meta}>{e.meta}</Text> : null}
                  {e.body?.trim() ? (
                    <Text style={styles.body}>{e.body.trim()}</Text>
                  ) : null}
                  <Text style={styles.by}>by {e.by?.trim() || 'System'}</Text>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </LeadSectionShell>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      alignItems: 'flex-start',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 999,
      marginTop: 14,
    },
    card: {
      flex: 1,
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
