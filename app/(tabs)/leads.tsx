import Ionicons from '@expo/vector-icons/Ionicons';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { useLeadCardSheets } from '@/components/leads/useLeadCardSheets';
import { ChipScroll } from '@/components/ui/ChipScroll';
import { FilterChip } from '@/components/ui/FilterChip';
import {
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { leadStatusesQuery, myLeadsQuery } from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { LeadListItem } from '@/types/api';
import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function LeadsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ focusSearch?: string }>();
  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState<number | undefined>();
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    if (params.focusSearch !== '1') return;
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
    router.setParams({ focusSearch: undefined });
  }, [params.focusSearch, router]);

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
  const { openLead, prefetchLead } = useLeadRowHandlers(items);
  const { openPriority, openHistory, sheets } = useLeadCardSheets();
  const renderLead = useCallback(
    ({ item }: { item: LeadListItem }) => (
      <LeadListItemCard
        lead={item}
        onPress={openLead}
        onPressIn={prefetchLead}
        onPriorityPress={openPriority}
        onHistoryPress={openHistory}
      />
    ),
    [openLead, prefetchLead, openPriority, openHistory]
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

      <ChipScroll style={styles.chips}>
        {filterChips.map((item) => {
          const active = (item.id === 0 && !statusId) || item.id === statusId;
          return (
            <FilterChip
              key={item.id}
              label={item.name}
              active={active}
              onPress={() => setStatusId(item.id === 0 ? undefined : item.id)}
            />
          );
        })}
      </ChipScroll>

      {!leads.data ? (
        <QueryPlaceholder
          query={leads}
          errorMessage={getErrorMessage(leads.error)}
          skeleton={<LeadListSkeleton />}
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

      {sheets}
    </View>
  );
}

export default memo(LeadsScreen);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
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
    chips: {
      marginVertical: 10,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: 0,
      paddingBottom: spacing.lg,
      gap: spacing.md,
      flexGrow: 1,
    },
    stale: { opacity: 0.6 },
  });
}
