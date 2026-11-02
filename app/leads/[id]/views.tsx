import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { LeadViewHistoryPanel } from '@/components/leads/LeadViewHistoryPanel';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/StateViews';
import { useLeadDetail } from '@/features/leads/useLeadDetail';
import { typography, useThemeColors, type ThemeColors } from '@/theme';

export default function LeadViewHistoryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);

  // Warm lead cache + record visit (same as other lead pages).
  useLeadDetail(leadId);

  if (!Number.isFinite(leadId)) {
    return (
      <Screen embedded>
        <ErrorState message="Lead not found" />
      </Screen>
    );
  }

  return (
    <Screen embedded scroll>
      <Text style={styles.pageTitle}>View History</Text>
      <LeadViewHistoryPanel leadId={leadId} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pageTitle: { ...typography.subtitle, color: colors.text },
  });
}
