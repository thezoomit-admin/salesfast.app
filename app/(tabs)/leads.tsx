import Ionicons from '@expo/vector-icons/Ionicons';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import {
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { leadStatusesQuery, myLeadsQuery } from '@/features/leads/leadsApi';
import type { LeadListItem } from '@/types/api';
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
  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState<number | undefined>();
  const debouncedSearch = useDebounced(search);

  const statuses = useQuery(leadStatusesQuery);

  // Keep the current list on screen while a new search / filter loads.
  const leads = useInfiniteQuery({
    ...myLeadsQuery(debouncedSearch, statusId),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => leads.data?.pages.flatMap((p) => p.items) ?? [],
    [leads.data]
  );
  const filterChips = useMemo(
    () => [
      { id: 0, name: 'All' },
      ...(Array.isArray(statuses.data) ? statuses.data : []),
    ],
    [statuses.data]
  );
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

  const toggleSearch = () => {
    setSearchOpen((open) => {
      const next = !open;
      if (next) {
        requestAnimationFrame(() => searchRef.current?.focus());
      } else {
        setSearch('');
        searchRef.current?.blur();
      }
      return next;
    });
  };

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Leads"
        showBack={false}
        right={
          <HeaderIconButton label="Search leads" onPress={toggleSearch}>
            <Ionicons
              name={searchOpen ? 'close' : 'search'}
              size={22}
              color={colors.text}
            />
          </HeaderIconButton>
        }
      />

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or phone"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <FlatList
        horizontal
        data={filterChips}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterList}
        renderItem={({ item }) => {
          const active = (item.id === 0 && !statusId) || item.id === statusId;
          return (
            <Pressable
              onPress={() => setStatusId(item.id === 0 ? undefined : item.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {!leads.data ? (
        <QueryPlaceholder
          query={leads}
          errorMessage={getErrorMessage(leads.error)}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          style={leads.isPlaceholderData && styles.stale}
          refreshing={leads.isRefetching && !leads.isPlaceholderData}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
  filterList: { flexGrow: 0 },
  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
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
  stale: { opacity: 0.6 },
});
