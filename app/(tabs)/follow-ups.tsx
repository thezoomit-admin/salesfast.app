import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import {
  followUpLeadsQuery,
  type FollowUpTab,
} from '@/features/leads/leadsApi';
import type { LeadListItem } from '@/types/api';
import { colors, radii, spacing, typography } from '@/theme';

export default function FollowUpsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FollowUpTab>('today');

  const query = useQuery(followUpLeadsQuery(tab));

  const openLead = useCallback(
    (lead: LeadListItem) => router.push(`/leads/${lead.id}`),
    [router]
  );
  const renderLead = useCallback(
    ({ item }: { item: LeadListItem }) => (
      <LeadListItemCard lead={item} onPress={openLead} />
    ),
    [openLead]
  );

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

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
        />
      ) : (
        <FlatList
          data={query.data.items}
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
          renderItem={renderLead}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
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
