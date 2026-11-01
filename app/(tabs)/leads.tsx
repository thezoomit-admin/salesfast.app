import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { fetchLeadStatuses, fetchMyLeads } from '@/features/leads/leadsApi';
import { colors, radii, spacing, typography } from '@/theme';

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LeadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState<number | undefined>();
  const debouncedSearch = useDebounced(search);

  const statuses = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: fetchLeadStatuses,
  });

  const leads = useInfiniteQuery({
    queryKey: ['my-leads', debouncedSearch, statusId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchMyLeads({
        page: pageParam,
        search: debouncedSearch,
        leadStatusId: statusId,
      }),
    getNextPageParam: (last) => {
      const current =
        last.meta.current_page ?? last.meta.page ?? 1;
      const lastPage =
        last.meta.last_page ?? last.meta.totalPages ?? current;
      return current < lastPage ? current + 1 : undefined;
    },
  });

  const items = leads.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
        <FlatList
          horizontal
          data={[
            { id: 0, name: 'All' },
            ...(Array.isArray(statuses.data) ? statuses.data : []),
          ]}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const active =
              (item.id === 0 && !statusId) || item.id === statusId;
            return (
              <Pressable
                onPress={() =>
                  setStatusId(item.id === 0 ? undefined : item.id)
                }
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {leads.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : leads.isError ? (
        <ErrorState
          message={getErrorMessage(leads.error)}
          onRetry={() => leads.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={leads.isRefetching}
          onRefresh={() => leads.refetch()}
          onEndReached={() => {
            if (leads.hasNextPage && !leads.isFetchingNextPage) {
              leads.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <EmptyState
              title="No leads found"
              message="Try a different search or status filter."
            />
          }
          ListFooterComponent={
            leads.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ margin: spacing.lg }}
              />
            ) : (
              <View />
            )
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  search: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
  },
  filters: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
