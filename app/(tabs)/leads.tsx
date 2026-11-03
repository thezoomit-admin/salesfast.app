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
  Animated,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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
import { CountTab, CountTabDivider } from '@/components/ui/CountTab';
import {
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import {
  leadStatusesQuery,
  leadTabCountsQuery,
  myLeadsQuery,
  type LeadListTab,
} from '@/features/leads/leadsApi';
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
  const [tab, setTab] = useState<LeadListTab>('all');
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    if (params.focusSearch !== '1') return;
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
    router.setParams({ focusSearch: undefined });
  }, [params.focusSearch, router]);

  const statuses = useQuery(leadStatusesQuery);
  const counts = useQuery({
    ...leadTabCountsQuery(debouncedSearch),
    placeholderData: keepPreviousData,
  });

  // Keep the current list on screen while a new search / filter loads.
  const leads = useInfiniteQuery({
    ...myLeadsQuery(debouncedSearch, tab),
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => leads.data?.pages.flatMap((p) => p.items) ?? [],
    [leads.data]
  );
  const statusTabs = Array.isArray(statuses.data) ? statuses.data : [];
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

      <ChipScroll
        style={styles.chips}
        contentContainerStyle={styles.tabsContent}
      >
        <CountTab
          label="All"
          count={counts.data?.all}
          active={tab === 'all'}
          onPress={() => setTab('all')}
        />
        <CountTab
          label="Unread"
          count={counts.data?.unread}
          active={tab === 'unread'}
          onPress={() => setTab('unread')}
        />
        {statusTabs.length > 0 ? <CountTabDivider /> : null}
        {statusTabs.map((status) => (
          <CountTab
            key={status.id}
            label={status.name}
            count={counts.data ? (counts.data.byStatus[status.id] ?? 0) : undefined}
            active={tab === status.id}
            onPress={() => setTab(status.id)}
          />
        ))}
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
          onScroll={onScroll}
          scrollEventThrottle={16}
          ListEmptyComponent={
            tab === 'unread' && !debouncedSearch ? (
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
