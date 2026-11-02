import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LeadDetailTabBar } from '@/components/leads/LeadDetailTabBar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { fetchLeadById, startLeadView } from '@/features/leads/leadsApi';
import { useThemeColors, type ThemeColors } from '@/theme';

export default function LeadDetailLayout() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);

  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });

  // One visit per lead open — feeds View History (web portal parity).
  useEffect(() => {
    if (!Number.isFinite(leadId)) return;
    void startLeadView(leadId)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['lead-views', leadId] })
      )
      .catch(() => {
        // Best effort.
      });
  }, [leadId, queryClient]);

  const title =
    leadQuery.data?.buyerPersona?.fullName?.trim() ||
    (Number.isFinite(leadId) ? `Lead #${leadId}` : 'Lead');

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <Tabs
          tabBar={(props) => <LeadDetailTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            lazy: false,
            freezeOnBlur: true,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Overview' }} />
          <Tabs.Screen name="history" options={{ title: 'History' }} />
          <Tabs.Screen name="calls" options={{ title: 'Call History' }} />
          <Tabs.Screen name="views" options={{ title: 'View History' }} />
        </Tabs>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1 },
  });
}
