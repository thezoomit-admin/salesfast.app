import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActivitiesSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatDateTime } from '@/utils/dates';

export default function ActivitiesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const query = useQuery(dashboardQuery);

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Activities" />
      <Text style={styles.subtitle}>
        Recent notes from your assigned leads. Matched calls sync from the Android
        build.
      </Text>

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<ActivitiesSkeleton />}
        />
      ) : (
        <FlatList
          data={query.data.recentNotes}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
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
}
