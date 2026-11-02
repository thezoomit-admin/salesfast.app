import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import { Screen } from '@/components/ui/Screen';
import { LeadDetailSkeleton } from '@/components/ui/skeletons';
import {
  ErrorState,
  QueryPlaceholder,
} from '@/components/ui/StateViews';
import { useLeadDetail } from '@/features/leads/useLeadDetail';
import { typography, useThemeColors, type ThemeColors } from '@/theme';

export default function LeadCallHistoryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const { leadQuery } = useLeadDetail(leadId);

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
      <Text style={styles.pageTitle}>Call History</Text>
      <LeadCallHistoryPanel lead={leadQuery.data} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pageTitle: { ...typography.subtitle, color: colors.text },
  });
}
