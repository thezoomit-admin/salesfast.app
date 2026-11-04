import { HugeiconsIcon } from '@hugeicons/react-native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  MultiplicationSignIcon,
  Search02Icon,
} from '@/components/icons/hugeicons';
import {
  HeaderFilterButton,
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { ActivitiesSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { activitiesQuery, type Activity } from '@/features/activities/activitiesApi';
import { describeActivity } from '@/features/activities/activityDisplay';
import { ActivityFilterSheet } from '@/features/activities/ActivityFilterSheet';
import {
  NO_FILTERS,
  filterCount,
  type ActivityFilters,
} from '@/features/activities/activityFilters';
import { ActivityRow } from '@/features/activities/ActivityRow';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { groupByDay } from '@/features/leads/dayGroups';
import { radii, spacing, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

const SEARCH_DEBOUNCE_MS = 2000;
const SEARCH_BAR_HEIGHT = 56;
const SEARCH_REVEAL_MS = 220;

type Section = { key: string; title: string; data: Activity[] };

export default function ActivitiesScreen() {
  const { colors, resolved } = useTheme();
  const pageWash = resolved === 'dark' ? colors.background : '#EEF1F4';
  const styles = useMemo(() => createStyles(colors, pageWash), [colors, pageWash]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [reveal] = useState(() => new Animated.Value(0));
  const searchRef = useRef<TextInputInstance>(null);

  // Clearing the box takes effect at once; only typing waits.
  useEffect(() => {
    const next = search.trim();
    const timer = setTimeout(() => setTerm(next), next ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
    else searchRef.current?.blur();
    Animated.timing(reveal, {
      toValue: searchOpen ? 1 : 0,
      duration: SEARCH_REVEAL_MS,
      easing: Easing.out(Easing.cubic),
      // Height can't run on the native driver.
      useNativeDriver: false,
    }).start();
  }, [searchOpen, reveal]);

  const toggleSearch = () => {
    if (searchOpen) setSearch('');
    setSearchOpen(!searchOpen);
  };

  const pickedFilters = filterCount(filters);
  const narrowed = pickedFilters > 0 || term.length > 0;

  // The Home summary already holds the newest notes: paint those right away.
  const recent = queryClient.getQueryData<MobileDashboard>(
    dashboardQuery.queryKey
  )?.recentNotes;

  const query = useInfiniteQuery({
    ...activitiesQuery(term, filters),
    placeholderData: (previous) =>
      previous ??
      (recent && !narrowed
        ? { pages: [{ items: recent, nextCursor: null }], pageParams: [null] }
        : undefined),
  });
  const { refetch } = query;

  // A note added on a lead should be here on the way back.
  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch])
  );

  const sections = useMemo<Section[]>(() => {
    const items = query.data?.pages.flatMap((p) => p.items) ?? [];
    return groupByDay(items, (a) => a.createdAt).map((day) => ({
      key: day.key,
      title: day.label,
      data: day.items,
    }));
  }, [query.data]);

  const showingOldResults =
    query.isPlaceholderData && query.data?.pages[0]?.items !== recent;
  const searching = search.trim() !== term || showingOldResults;

  const onOpen = useCallback(
    (leadId: number) => router.push(`/leads/${leadId}`),
    [router]
  );

  const closeFilter = useCallback(() => setFilterOpen(false), []);

  const clearAll = () => {
    setFilters(NO_FILTERS);
    setSearch('');
  };

  const renderItem = useCallback(
    ({ item, index, section }: { item: Activity; index: number; section: Section }) => {
      const last = index === section.data.length - 1;
      return (
        <View style={[styles.row, last && styles.rowLast]}>
          <ActivityRow
            leadId={item.leadId}
            leadName={item.leadName}
            createdAt={item.createdAt}
            view={describeActivity(item)}
            last={last}
            onOpen={onOpen}
          />
        </View>
      );
    },
    [onOpen, styles]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <View style={styles.panelTop}>
        <Text style={styles.panelTitle}>{section.title}</Text>
      </View>
    ),
    [styles]
  );

  const renderSectionFooter = useCallback(
    () => <View style={styles.panelGap} />,
    [styles]
  );

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Activities"
        right={
          <>
            <HeaderIconButton
              label={searchOpen ? 'Close search' : 'Search activities'}
              onPress={toggleSearch}
            >
              <HugeiconsIcon
                icon={searchOpen ? MultiplicationSignIcon : Search02Icon}
                size={22}
                color={colors.text}
                strokeWidth={1.5}
              />
            </HeaderIconButton>
            <HeaderFilterButton
              label="Filter activities"
              count={pickedFilters}
              onPress={() => setFilterOpen(true)}
            />
          </>
        }
      />

      <Animated.View
        pointerEvents={searchOpen ? 'auto' : 'none'}
        accessibilityElementsHidden={!searchOpen}
        importantForAccessibility={searchOpen ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.searchReveal,
          {
            opacity: reveal,
            height: reveal.interpolate({
              inputRange: [0, 1],
              outputRange: [0, SEARCH_BAR_HEIGHT],
            }),
          },
        ]}
      >
        <View style={styles.searchBar}>
          {searching ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <HugeiconsIcon
              icon={Search02Icon}
              size={16}
              color={colors.textMuted}
              strokeWidth={1.5}
            />
          )}
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setTerm(search.trim())}
            editable={searchOpen}
            placeholder="Search lead, phone or note"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.searchInput}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
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
      </Animated.View>

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<ActivitiesSkeleton />}
        />
      ) : (
        <SectionList
          // A new search or filter starts at the top of its own results.
          key={JSON.stringify([term, filters])}
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          style={showingOldResults && styles.stale}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={query.isRefetching && !query.isFetchingNextPage && !query.isPlaceholderData}
          onRefresh={() => query.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage && !query.isPlaceholderData) {
              void query.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            narrowed ? (
              <EmptyState
                icon="search-outline"
                title="No matching activities"
                message="Try a different search or filter."
                actionLabel="Clear all"
                onAction={clearAll}
              />
            ) : (
              <EmptyState
                title="No recent activities"
                message="Notes you add on leads will show up here."
              />
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand} style={styles.footer} />
            ) : undefined
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      <ActivityFilterSheet
        open={filterOpen}
        value={filters}
        onApply={setFilters}
        onClose={closeFilter}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, pageWash: string) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: pageWash },
    // The 40px tap areas leave a wide gap between the two 22px icons.
    searchReveal: { overflow: 'hidden', paddingHorizontal: spacing.lg },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 44,
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
      paddingVertical: 0,
    },
    stale: { opacity: 0.6 },
    list: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    panelTop: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
    },
    panelTitle: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
    },
    row: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
    },
    rowLast: {
      paddingBottom: 14,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
    },
    panelGap: { height: spacing.md },
    footer: { paddingVertical: spacing.lg },
  });
}
