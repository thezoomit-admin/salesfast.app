import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { fetchMobileDashboard } from '@/features/dashboard/dashboardApi';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/dates';

export default function ActivitiesScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['mobile-dashboard'],
    queryFn: fetchMobileDashboard,
  });

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>
          Recent notes from your assigned leads. Matched calls sync from the Android build.
        </Text>
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
          data={query.data?.recentNotes ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState
              title="No recent activities"
              message="Notes you add on leads will show up here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/leads/${item.leadId}`)}
            >
              <View style={styles.row}>
                <Text style={styles.lead}>{item.leadName}</Text>
                <Text style={styles.channel}>
                  {item.channel?.name || 'Note'}
                </Text>
              </View>
              <Text style={styles.note} numberOfLines={3}>
                {item.note}
              </Text>
              <Text style={styles.meta}>
                {item.addedByName || 'Agent'} · {formatDateTime(item.createdAt)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  subtitle: { ...typography.body, color: colors.textSecondary },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  lead: { ...typography.subtitle, color: colors.text, flex: 1 },
  channel: { ...typography.caption, color: colors.brand },
  note: { ...typography.body, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textMuted },
});
