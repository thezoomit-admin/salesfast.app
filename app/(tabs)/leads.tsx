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
  Animated,
  Pressable,
  StyleSheet,
  type TextInputInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import { type SceneRendererProps, TabView } from 'react-native-tab-view';

import { heroBase } from '@/components/home/HomeHero';
import { LeadFilterPills } from '@/components/leads/LeadFilterPills';
import { LeadFilterSheet } from '@/components/leads/LeadFilterSheet';
import { LeadTabPage } from '@/components/leads/LeadTabPage';
import { type LeadTabItem, LeadTabs } from '@/components/leads/LeadTabs';
import { useLeadCardSheets } from '@/components/leads/useLeadCardSheets';
import { Screen } from '@/components/ui/Screen';
import { LeadListSkeleton } from '@/components/ui/skeletons';
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
import type { LeadStatus } from '@/types/api';
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

/** Pager routes: one page per tab pill, keyed by the tab as a string. */
type LeadRoute = { key: string };

/** Pages this far from the shown one are built (and load their list) ahead. */
const PRELOAD_DISTANCE = 1;

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

  // Draft never reaches an agent's list; Unread sits right after Assign.
  const { assignTab, statusTabs } = useMemo(() => {
    const list = (Array.isArray(statuses.data) ? statuses.data : []).filter(
      (s) => !isDraftStatus(s)
    );
    const assign = list.find(isAssignStatus);
    return { assignTab: assign, statusTabs: list.filter((s) => s !== assign) };
  }, [statuses.data]);

  const tabIds = useMemo(
    () =>
      [assignTab, ...statusTabs]
        .filter((s): s is LeadStatus => Boolean(s))
        .map((s) => s.id)
        .join(','),
    [assignTab, statusTabs]
  );

  // Finger down on a tab starts its request ahead of the tap (covers search).
  const prefetchTab = useCallback(
    (t: LeadListTab) =>
      void queryClient.prefetchInfiniteQuery(
        myLeadsQuery(debouncedSearch, t, filters)
      ),
    [queryClient, debouncedSearch, filters]
  );
  const { openPriority, openHistory, sheets } = useLeadCardSheets();

  // Hisab FAB — hides while scrolling down, comes back on scroll up.
  const [fabVisible] = useState(() => new Animated.Value(1));
  const fabShown = useRef(true);
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

  // One pager page per pill, in the pill row's order. A drag moves the shown
  // page and its neighbour together under the finger (native ViewPager2 on
  // Android); the pill follows as soon as the page is chosen on release.
  // Keyed by the tab set only, so a badge count change doesn't hand the
  // pager new routes.
  const routeKeys = tabItems.map((t) => String(t.key)).join(',');
  const routes = useMemo<LeadRoute[]>(
    () => routeKeys.split(',').map((key) => ({ key })),
    [routeKeys]
  );
  // A status picked from Home before the statuses load (or one since
  // removed) has no page: All shows until it does.
  const pickedIndex = tabItems.findIndex((t) => t.key === tab);
  const shownTab: LeadListTab = pickedIndex < 0 ? 'all' : tab;
  const tabIndex = Math.max(0, pickedIndex);
  const navigationState = useMemo(
    () => ({ index: tabIndex, routes }),
    [tabIndex, routes]
  );

  // The shown page owns this list (LeadTabPage). This is the same cache
  // entry, read here only to know when to warm the other tabs: no request.
  const shownList = useInfiniteQuery({
    ...myLeadsQuery(debouncedSearch, shownTab, filters),
    placeholderData: keepPreviousData,
    notifyOnChangeProps: ['data', 'isPlaceholderData'],
  });
  // Warm every tab's first page once this one is in, so switching is instant.
  // Fresh cache is skipped, so this costs nothing on later visits.
  const listReady =
    Boolean(shownList.data) && !shownList.isPlaceholderData;
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

  // The pager reports a new page only once it has settled. While a finger
  // drags (and the page settles after it) the pill follows the page nearest
  // the middle instead, so it never trails the content.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragging = useRef(false);
  const committedIndex = useRef(tabIndex);
  useEffect(() => {
    committedIndex.current = tabIndex;
  }, [tabIndex]);
  const onSwipeStart = useCallback(() => {
    dragging.current = true;
  }, []);
  const onSwipeEnd = useCallback(() => {
    dragging.current = false;
    // Sprang back: nothing to commit. Otherwise onIndexChange clears it.
    setDragIndex((i) => (i === committedIndex.current ? null : i));
  }, []);
  const onDragPosition = useCallback((index: number) => {
    if (dragging.current) setDragIndex(index);
  }, []);
  const shownIndex = dragIndex ?? tabIndex;
  const pillTab = tabItems[shownIndex]?.key ?? shownTab;

  const onIndexChange = useCallback(
    (index: number) => {
      const next = tabItems[index];
      if (!next) return;
      setDragIndex(null);
      setTab(next.key);
      setFabShown(true);
    },
    [tabItems, setFabShown]
  );
  const { width: windowWidth } = useWindowDimensions();
  const initialLayout = useMemo(() => ({ width: windowWidth }), [windowWidth]);

  const narrowed = pickedFilters > 0 || Boolean(debouncedSearch.trim());
  const clearAll = useCallback(() => {
    clearFilters();
    setSearch('');
  }, [clearFilters]);
  const renderScene = ({
    route,
  }: SceneRendererProps & { route: LeadRoute }) => {
    const pageIndex = routes.findIndex((r) => r.key === route.key);
    const page = tabItems[pageIndex];
    if (!page) return null;
    return (
      <LeadTabPage
        tab={page.key}
        search={debouncedSearch}
        filters={filters}
        enabled={Math.abs(pageIndex - tabIndex) <= PRELOAD_DISTANCE}
        narrowed={narrowed}
        onClearAll={clearAll}
        onPriorityPress={openPriority}
        onHistoryPress={openHistory}
        onFabShown={setFabShown}
      />
    );
  };

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
          active={pillTab}
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

      <TabView<LeadRoute>
        // The page set changes once, when the statuses arrive. A fresh pager
        // then opens on the right page instead of sliding over to it.
        key={routeKeys}
        navigationState={navigationState}
        onIndexChange={onIndexChange}
        renderScene={renderScene}
        // The pills live above the filter row, outside the pager; this only
        // feeds them the live page position.
        renderTabBar={({ position }) => (
          <PagerPosition position={position} onIndex={onDragPosition} />
        )}
        onSwipeStart={onSwipeStart}
        onSwipeEnd={onSwipeEnd}
        initialLayout={initialLayout}
        // The shown page and its neighbours are built up front, so a drag
        // always reveals a real list; others build on first visit. A built
        // page stays mounted: coming back never rebuilds or refetches it.
        lazy
        lazyPreloadDistance={PRELOAD_DISTANCE}
        renderLazyPlaceholder={() => <LeadListSkeleton />}
        // Swiping tabs mid-search keeps the keyboard up, as before.
        keyboardDismissMode="none"
        style={styles.pager}
      />

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

/**
 * Reports the page nearest the middle as the pager moves. The callback runs
 * per frame only while the pager moves, and the screen re-renders only when
 * that page changes.
 *
 * The pager drives `position` on the native side. A native value only
 * reports back to JS listeners once it is bound to a view, hence the empty,
 * invisible view: without it the listener never fires on Android.
 */
function PagerPosition({
  position,
  onIndex,
}: {
  position: Animated.AnimatedInterpolation<number>;
  onIndex: (index: number) => void;
}) {
  useEffect(() => {
    const id = position.addListener(({ value }) => onIndex(Math.round(value)));
    return () => position.removeListener(id);
  }, [position, onIndex]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[pagerPositionStyle, { transform: [{ translateX: position }] }]}
    />
  );
}

const pagerPositionStyle = {
  position: 'absolute',
  width: 0,
  height: 0,
  opacity: 0,
} as const;

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
    pager: { flex: 1 },
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
