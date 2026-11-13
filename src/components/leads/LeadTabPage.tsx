import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { memo, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadEmpty } from '@/components/leads/LeadEmpty';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import type { LeadListMode } from '@/features/auth/leadAccess';
import type { LeadFilters } from '@/features/leads/leadFilters';
import { leadsListQuery, type LeadListTab } from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { LeadListItem } from '@/types/api';
import { spacing, useThemeColors } from '@/theme';

type Props = {
  mode: LeadListMode;
  tab: LeadListTab;
  search: string;
  filters: LeadFilters;
  /** Shown or next to the shown page: loads its list. Further pages wait. */
  enabled: boolean;
  /** Search or filters are on, so an empty list means "nothing matched". */
  narrowed: boolean;
  onClearAll: () => void;
  onPriorityPress: (lead: LeadListItem) => void;
  onHistoryPress: (lead: LeadListItem) => void;
  /** The Hisab FAB hides on scroll down and comes back on scroll up. */
  onFabShown: (show: boolean) => void;
};

/**
 * One lead tab's list, a page of the Leads pager. Every page owns its list,
 * so the page next to the shown one already has rows to show while the finger
 * drags it in. A page stays mounted once built, keeping its scroll position.
 */
function LeadTabPageBase({
  mode,
  tab,
  search,
  filters,
  enabled,
  narrowed,
  onClearAll,
  onPriorityPress,
  onHistoryPress,
  onFabShown,
}: Props) {
  const colors = useThemeColors();

  // A new search keeps this tab's rows on screen (dimmed) until the new ones
  // land. The key only ever changes by search or filters, never by tab.
  const leads = useInfiniteQuery({
    ...leadsListQuery(mode, search, tab, filters),
    enabled,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => leads.data?.pages.flatMap((p) => p.items) ?? [],
    [leads.data]
  );
  const { openLead, prefetchLead } = useLeadRowHandlers(items);
  const renderLead = useCallback(
    ({ item }: { item: LeadListItem }) => (
      <LeadListItemCard
        lead={item}
        onPress={openLead}
        onPressIn={prefetchLead}
        onPriorityPress={onPriorityPress}
        onHistoryPress={onHistoryPress}
      />
    ),
    [openLead, prefetchLead, onPriorityPress, onHistoryPress]
  );

  // Per page, so a jump between pages scrolled to different depths doesn't
  // read as a scroll.
  const lastScrollY = useRef(0);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const dy = y - lastScrollY.current;
      if (y <= 12) onFabShown(true);
      else if (dy > 4 && y > 24) onFabShown(false);
      else if (dy < -4) onFabShown(true);
      lastScrollY.current = y;
    },
    [onFabShown]
  );

  if (!leads.data) {
    return (
      <QueryPlaceholder
        query={leads}
        errorMessage={getErrorMessage(leads.error)}
        skeleton={<LeadListSkeleton />}
      />
    );
  }

  return (
    <FlatList
      // New filters start at the top, not the old scroll offset.
      key={JSON.stringify(filters)}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
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
        if (enabled && leads.hasNextPage && !leads.isFetchingNextPage) {
          void leads.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      onScroll={onScroll}
      scrollEventThrottle={16}
      ListEmptyComponent={
        <LeadEmpty
          kind={narrowed ? 'filtered' : tab === 'unread' ? 'unread' : 'all'}
          onClearFilters={onClearAll}
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
  );
}

export const LeadTabPage = memo(LeadTabPageBase);

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    // Room for the FAB over the last row.
    paddingBottom: 88,
    gap: spacing.md,
    flexGrow: 1,
  },
  stale: { opacity: 0.6 },
});
