import Ionicons from '@expo/vector-icons/Ionicons';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { heroBase } from '@/components/home/HomeHero';
import { LeadEmpty } from '@/components/leads/LeadEmpty';
import { LeadFilterPills } from '@/components/leads/LeadFilterPills';
import { LeadFilterSheet } from '@/components/leads/LeadFilterSheet';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { type LeadTabItem, LeadTabs } from '@/components/leads/LeadTabs';
import { useLeadCardSheets } from '@/components/leads/useLeadCardSheets';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Screen } from '@/components/ui/Screen';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import {
  type SwipeDirection,
  SwipeTabArea,
} from '@/components/ui/SwipeTabArea';
import { useAuth } from '@/features/auth/AuthContext';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  NO_LEAD_FILTERS,
  leadFilterCount,
  leadFilterPills,
  type LeadFilters,
} from '@/features/leads/leadFilters';
import {
  isDraftStatus,
  leadSourcesQuery,
  leadStatusesQuery,
  leadTabCountsQuery,
  myLeadsQuery,
  type LeadListTab,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import {
  type InboxPalette,
  inboxPalette,
} from '@/features/notifications/inboxPalette';
import {
  LEADS_SCENE,
  NotificationsHero,
} from '@/features/notifications/NotificationsHero';
import { useTabIntent } from '@/lib/tabIntent';
import { useDebounced } from '@/lib/useDebounced';
import type { LeadListItem, LeadStatus } from '@/types/api';
import {
  radii,
  spacing,
  useTheme,
  useThemeColors,
  type ThemeColors,
} from '@/theme';

// Name fallback until every server sends `code`.
const isAssignStatus = (s: LeadStatus) =>
  s.code === 'ASSIGN' || /^assign(ed)?$/i.test(s.name.trim());

function LeadsScreen() {
  const colors = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = inboxPalette(isDark);
  const styles = useMemo(
    () => createStyles(colors, palette),
    [colors, palette]
  );
  const router = useRouter();
  const { user } = useAuth();
  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<LeadListTab>('all');
  const [filters, setFilters] = useState<LeadFilters>(NO_LEAD_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedSearch = useDebounced(search);
  const queryClient = useQueryClient();

  // Home's shortcuts: 'search', 'unread' or a status id.
  const focusSearchOnArrival = useRef(false);
  const onIntent = useCallback((value: string) => {
    if (value === 'search') {
      setSearchOpen(true);
      focusSearchOnArrival.current = true;
    } else {
      setTab(value === 'unread' ? 'unread' : Number(value));
    }
  }, []);
  useTabIntent('leads', onIntent);
  // A preloaded page is still off screen when the intent lands, and an
  // off-screen input can't take focus.
  useFocusEffect(
    useCallback(() => {
      if (!focusSearchOnArrival.current) return;
      focusSearchOnArrival.current = false;
      requestAnimationFrame(() => searchRef.current?.focus());
    }, [])
  );

  // The hero is dark enough to need light icons in both themes.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  // Shares the Home dashboard cache, so this adds no extra request.
  const { data: dashboard } = useQuery(dashboardQuery);
  const summary = dashboard
    ? `${dashboard.kpis.todayFollowUps} due · ${dashboard.kpis.overdueFollowUps} overdue`
    : null;

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
    const all: LeadListTab[] = [
      'all',
      'unread',
      ...tabIds.split(',').map(Number),
    ];
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

  // All, Assign, Unread, then the other statuses.
  const tabItems = useMemo(() => {
    const byStatus = counts.data?.byStatus;
    const statusItem = (s: LeadStatus): LeadTabItem => ({
      key: s.id,
      label: s.name,
      count: byStatus?.[s.id],
    });
    return [
      { key: 'all', label: 'All', count: counts.data?.all },
      ...(assignTab ? [statusItem(assignTab)] : []),
      { key: 'unread', label: 'Unread', count: counts.data?.unread },
      ...statusTabs.map(statusItem),
    ] satisfies LeadTabItem[];
  }, [counts.data, assignTab, statusTabs]);

  // Swiping the list moves to the neighbouring tab, in the tab row's order.
  const tabIndex = tabItems.findIndex((t) => t.key === tab);
  const swipeTab = useCallback(
    (direction: SwipeDirection) => {
      const next = tabItems[tabIndex + direction];
      if (!next) return;
      prefetchTab(next.key);
      setTab(next.key);
    },
    [tabItems, tabIndex, prefetchTab]
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
    <Screen
      header={
        <NotificationsHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
          searchOpen={searchOpen}
          search={search}
          searchRef={searchRef}
          onSearchChange={setSearch}
          onToggleSearch={toggleSearch}
          onOpenFilter={() => setFilterOpen(true)}
          filterCount={pickedFilters}
          title="Leads"
          tagline={'Track every lead &\nclose more deals'}
          searchPlaceholder="Search name or phone"
          itemsLabel="leads"
          scene={LEADS_SCENE}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      <View style={styles.tabs}>
        <LeadTabs
          tabs={tabItems}
          active={tab}
          onChange={setTab}
          onPressIn={prefetchTab}
        />
      </View>

      {filterPills.length > 0 ? (
        <LeadFilterPills
          pills={filterPills}
          onChange={setFilters}
          onClear={clearFilters}
        />
      ) : null}

      <SwipeTabArea
        canPrev={tabIndex > 0}
        canNext={tabIndex < tabItems.length - 1}
        onSwipe={swipeTab}
      >
        {!leads.data ? (
          <QueryPlaceholder
            query={leads}
            errorMessage={getErrorMessage(leads.error)}
            skeleton={<LeadListSkeleton />}
          />
        ) : (
          <FlatList
            // New tab or filter starts at the top, not the old scroll offset.
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            key={JSON.stringify([tab, filters])}
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            style={leads.isPlaceholderData && styles.stale}
            refreshControl={
              <AppRefreshControl
                refreshing={leads.isRefetching && !leads.isPlaceholderData}
                onRefresh={() => void leads.refetch()}
              />
            }
            onEndReached={() => {
              if (leads.hasNextPage && !leads.isFetchingNextPage) {
                void leads.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.4}
            onScroll={onScroll}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <LeadEmpty
                kind={
                  pickedFilters > 0 || debouncedSearch.trim()
                    ? 'filtered'
                    : tab === 'unread'
                      ? 'unread'
                      : 'all'
                }
                onClearFilters={() => {
                  clearFilters();
                  setSearch('');
                }}
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
          />
        )}
      </SwipeTabArea>

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
    </Screen>
  );
}

export default memo(LeadsScreen);

function createStyles(colors: ThemeColors, palette: InboxPalette) {
  return StyleSheet.create({
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its content,
      // or the list has nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      backgroundColor: palette.sheet,
    },
    tabs: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: spacing.md,
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
