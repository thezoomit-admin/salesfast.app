import { useMutationState } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
import { Screen } from '@/components/ui/Screen';
import { LeadDetailSkeleton } from '@/components/ui/skeletons';
import {
  ErrorState,
  QueryPlaceholder,
} from '@/components/ui/StateViews';
import {
  ADD_NOTE_MUTATION,
  type AddNoteVars,
} from '@/features/leads/leadWrites';
import { useLeadDetail } from '@/features/leads/useLeadDetail';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatDateTime } from '@/utils/dates';

export default function LeadHistoryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const { leadQuery } = useLeadDetail(leadId);

  const pendingNotes = useMutationState({
    filters: { mutationKey: ADD_NOTE_MUTATION, status: 'pending' },
    select: (m) => m.state.variables as AddNoteVars,
  }).filter((v) => v?.leadId === leadId);

  if (!leadQuery.data) {
    return (
      <Screen embedded>
        {Number.isFinite(leadId) ? (
          <QueryPlaceholder
            query={leadQuery}
            errorMessage={getErrorMessage(leadQuery.error, 'Lead not found')}
            skeleton={<LeadDetailSkeleton />}
          />
        ) : (
          <ErrorState message="Lead not found" />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      embedded
      scroll
      refreshing={leadQuery.isRefetching}
      onRefresh={() => leadQuery.refetch()}
    >
      <Text style={styles.pageTitle}>History</Text>
      {pendingNotes.map((note) => (
        <View key={note.clientId} style={styles.pendingNote}>
          <Text style={styles.pendingText}>
            Waiting to sync · {formatDateTime(new Date(note.queuedAt))}
          </Text>
          <Text style={styles.noteBody}>{note.note}</Text>
        </View>
      ))}
      <LeadHistoryPanel lead={leadQuery.data} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pageTitle: { ...typography.subtitle, color: colors.text },
    pendingNote: {
      borderWidth: 1,
      borderColor: colors.warningSoft,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 4,
      backgroundColor: colors.warningSoft,
    },
    pendingText: { ...typography.caption, color: colors.warning },
    noteBody: { ...typography.body, color: colors.textSecondary },
  });
}
