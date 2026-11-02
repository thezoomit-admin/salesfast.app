import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { fetchMyLeads } from '@/features/leads/leadsApi';
import { colors, radii, spacing, typography } from '@/theme';
import { endOfLocalDayIso, startOfLocalDayIso } from '@/utils/dates';

type TabKey = 'today' | 'overdue' | 'upcoming';

export default function FollowUpsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('today');

  const params =
    tab === 'overdue'
      ? { followupOverdue: true as const }
      : tab === 'today'
        ? {
            followupFrom: startOfLocalDayIso(),
            followupTo: endOfLocalDayIso(),
          }
        : {
            followupFrom: endOfLocalDayIso(),
          };

  const query = useQuery({
    queryKey: ['follow-up-leads', tab],
    queryFn: () => fetchMyLeads({ ...params, per_page: 50 }),
  });

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Follow-ups" showBack={false} />
      <View style={styles.tabs}>
        {(
          [
            ['today', 'Today'],
            ['overdue', 'Overdue'],
            ['upcoming', 'Upcoming'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No follow-ups"
              message="Nothing in this bucket right now."
            />
          }
          renderItem={({ item }) => (
            <LeadListItemCard
              lead={item}
              onPress={() => router.push(`/leads/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
});
