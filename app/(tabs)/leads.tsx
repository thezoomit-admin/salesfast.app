import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type NativeScrollEvent,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  Pressable,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  MultiplicationSignIcon,
  Search02Icon,
} from '@/components/icons/hugeicons';
import { LeadFilterPills } from '@/components/leads/LeadFilterPills';
import { LeadFilterSheet } from '@/components/leads/LeadFilterSheet';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { useLeadCardSheets } from '@/components/leads/useLeadCardSheets';
import { ChipScroll } from '@/components/ui/ChipScroll';
import { CountTab, CountTabDivider } from '@/components/ui/CountTab';
import {
  HeaderFilterButton,
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import {
  NO_LEAD_FILTERS,
  leadFilterCount,
  leadFilterPills,
  type LeadFilters,
} from '@/features/leads/leadFilters';
import {
  leadSourcesQuery,
  leadStatusesQuery,
  leadTabCountsQuery,
  myLeadsQuery,
  type LeadListTab,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { LeadListItem, LeadStatus } from '@/types/api';
import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Name fallback until every server sends `code`.
const isDraftStatus = (s: LeadStatus) =>
  s.code === 'DRAFT' || /^draft$/i.test(s.name.trim());
const isAssignStatus = (s: LeadStatus) =>
  s.code === 'ASSIGN' || /^assign(ed)?$/i.test(s.name.trim());

function LeadsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ focusSearch?: string }>();
  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<LeadListTab>('all');
  const [filters, setFilters] = useState<LeadFilters>(NO_LEAD_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedSearch = useDebounced(search);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (params.focusSearch !== '1') return;
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
    router.setParams({ focusSearch: undefined });
  }, [params.focusSearch, router]);

  const statuses = useQuery(leadStatusesQuery);
  const counts = useQuery({
    ...leadTabCountsQuery(debouncedSearch, filters),
    placeholderData: keepPreviousData,
  });
  // Only the filter needs these: the sheet, and the pills naming a source.
  const sources = useQuery({
    ...leadSourcesQuery,
    enabled: filterOpen || filters.sourceIds.length > 0,
  });
  const sourceList = useMemo(() => sources.data ?? [], [sources.data]);
  const filterPills = useMemo(
    () => leadFilterPills(filters, sourceList),
    [filters, sourceList]
  );
  const pickedFilters = leadFilterCount(filters);
  const closeFilter = useCallback(() => setFilterOpen(false), []);
  const clearFilters = useCallback(() => setFilters(NO_LEAD_FILTERS), []);

  // A new search keeps the tab's current rows on screen; a tab with nothing
  // cached shows the skeleton, never another tab's leads.
  const leads = useInfiniteQuery({
    ...myLeadsQuery(debouncedSearch, tab, filters),
    placeholderData: (prev, prevQuery) =>
      prevQuery?.queryKey[1] === tab ? prev : undefined,
  });

  const items = useMemo(
    () => leads.data?.pages.flatMap((p) => p.items) ?? [],
    [leads.data]
  );
  // Draft never reaches an agent's list; Unread sits right after Assign.
  const { assignTab, statusTabs } = useMemo(() => {
    const list = (Array.isArray(statuses.data) ? statuses.data : []).filter(
      (s) => !isDraftStatus(s)
    );
    const assign = list.find(isAssignStatus);
    return { assignTab: assign, statusTabs: list.filter((s) => s !== assign) };
  }, [statuses.data]);

  // Warm every tab's first page once this one is in, so switching is instant.
  // Fresh cache is skipped, so this costs nothing on later visits.
  const listReady = Boolean(leads.data) && !leads.isPlaceholderData;
  const tabIds = useMemo(
    () =>
      [assignTab, ...statusTabs]
        .filter((s): s is LeadStatus => Boolean(s))
        .map((s) => s.id)
        .join(','),
    [assignTab, statusTabs]
  );
  useEffect(() => {
    if (!listReady || !tabIds) return;
    const all: LeadListTab[] = ['all', 'unread', ...tabIds.split(',').map(Number)];
    for (const t of all) {
      void queryClient.prefetchInfiniteQuery(myLeadsQuery('', t));
    }
  }, [listReady, tabIds, queryClient]);

  // Finger down on a tab starts its request ahead of the tap (covers search).
  const prefetchTab = useCallback(
    (t: LeadListTab) =>
      void queryClient.prefetchInfiniteQuery(
        myLeadsQuery(debouncedSearch, t, filters)
      ),
    [queryClient, debouncedSearch, filters]
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

  // Hisab FAB — hides while scrolling down, comes back on scroll up.
  const [fabVisible] = useState(() => new Animated.Value(1));
  const fabShown = useRef(true);
  const lastScrollY = useRef(0);
  const setFabShown = useCallback(
    (show: boolean) => {
      if (fabShown.current === show) return;
      fabShown.current = show;
      Animated.timing(fabVisible, {
        toValue: show ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [fabVisible]
  );
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      if (y <= 12) setFabShown(true);
      else if (dy > 4 && y > 24) setFabShown(false);
      else if (dy < -4) setFabShown(true);
      lastScrollY.current = y;
    },
    [setFabShown]
  );

  // Picking a tab slides the row so that tab sits in the middle — the
  // neighbours on the side you moved toward scroll into view.
  const tabScrollRef = useRef<ScrollViewInstance>(null);
  const tabLayouts = useRef(new Map<string, { x: number; width: number }>());
  const tabRow = useRef({ viewport: 0, content: 0 });
  const centerTab = useCallback((t: LeadListTab) => {
    const item = tabLayouts.current.get(String(t));
    const { viewport, content } = tabRow.current;
    if (!item || !viewport) return;
    const max = Math.max(0, content - viewport);
    const x = Math.min(max, Math.max(0, item.x + item.width / 2 - viewport / 2));
    tabScrollRef.current?.scrollTo({ x, animated: true });
  }, []);
  useEffect(() => {
    centerTab(tab);
  }, [tab, centerTab]);
  const onTabLayout = useCallback(
    (t: LeadListTab) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      tabLayouts.current.set(String(t), { x, width });
    },
    []
  );

  const renderStatusTab = (status: LeadStatus) => (
    <CountTab
      key={status.id}
      label={status.name}
      count={counts.data ? (counts.data.byStatus[status.id] ?? 0) : undefined}
      active={tab === status.id}
      onPress={() => setTab(status.id)}
      onPressIn={() => prefetchTab(status.id)}
      onLayout={onTabLayout(status.id)}
    />
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
          <>
            <HeaderIconButton label="Search leads" onPress={toggleSearch}>
              <HugeiconsIcon
                icon={searchOpen ? MultiplicationSignIcon : Search02Icon}
                size={22}
                color={colors.text}
                strokeWidth={1.5}
              />
            </HeaderIconButton>
            <HeaderFilterButton
              label="Filter leads"
              count={pickedFilters}
              onPress={() => setFilterOpen(true)}
            />
          </>
        }
      />

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <HugeiconsIcon
            icon={Search02Icon}
            size={16}
            color={colors.textMuted}
            strokeWidth={1.5}
          />
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
              <HugeiconsIcon
                icon={MultiplicationSignIcon}
                size={18}
                color={colors.textMuted}
                strokeWidth={1.5}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ChipScroll
        style={styles.chips}
        contentContainerStyle={styles.tabsContent}
        scrollRef={tabScrollRef}
        onLayout={(e) => {
          tabRow.current.viewport = e.nativeEvent.layout.width;
        }}
        onContentSizeChange={(w) => {
          tabRow.current.content = w;
        }}
      >
        <CountTab
          label="All"
          count={counts.data?.all}
          active={tab === 'all'}
          onPress={() => setTab('all')}
          onPressIn={() => prefetchTab('all')}
          onLayout={onTabLayout('all')}
        />
        <CountTabDivider />
        {assignTab ? renderStatusTab(assignTab) : null}
        <CountTab
          label="Unread"
          count={counts.data?.unread}
          active={tab === 'unread'}
          onPress={() => setTab('unread')}
          onPressIn={() => prefetchTab('unread')}
          onLayout={onTabLayout('unread')}
        />
        {statusTabs.map(renderStatusTab)}
      </ChipScroll>

      {filterPills.length > 0 ? (
        <LeadFilterPills
          pills={filterPills}
          onChange={setFilters}
          onClear={clearFilters}
        />
      ) : null}

      {!leads.data ? (
        <QueryPlaceholder
          query={leads}
          errorMessage={getErrorMessage(leads.error)}
          skeleton={<LeadListSkeleton />}
        />
      ) : (
        <FlatList
          // New tab or filter starts at the top, not the old scroll offset.
          key={JSON.stringify([tab, filters])}
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
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            pickedFilters > 0 ? (
              <EmptyState
                icon="search-outline"
                title="No matching leads"
                message="Try a different search, tab or filter."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : tab === 'unread' && !debouncedSearch ? (
              <EmptyState
                title="All caught up"
                message="Every lead assigned to you has been opened."
              />
            ) : (
              <EmptyState
                title="No leads found"
                message="Try a different search or tab."
              />
            )
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

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.fabWrap,
          {
            opacity: fabVisible,
            transform: [
              {
                translateY: fabVisible.interpolate({
                  inputRange: [0, 1],
                  outputRange: [72, 0],
                }),
              },
              {
                scale: fabVisible.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.85, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add lead"
          onPress={() => router.push('/leads/new')}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={30} color={colors.white} />
        </Pressable>
      </Animated.View>

      {sheets}

      <LeadFilterSheet
        open={filterOpen}
        value={filters}
        sources={sourceList}
        sourcesLoading={sources.isLoading}
        onApply={setFilters}
        onClose={closeFilter}
      />
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
    tabsContent: {
      gap: spacing.md,
    },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: 0,
      // Room for the FAB over the last row.
      paddingBottom: 88,
      gap: spacing.md,
      flexGrow: 1,
    },
    stale: { opacity: 0.6 },
    fabWrap: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      zIndex: 20,
      elevation: 12,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.brand,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
  });
}
