import { HugeiconsIcon } from '@hugeicons/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  type Href,
  useFocusEffect,
  useNavigation,
  usePathname,
  useRouter,
} from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { heroBase } from '@/components/home/HomeHero';
import {
  Bookmark02Icon,
  CalendarClockIcon,
  ClockAlertIcon,
  Notification01Icon,
  Search02Icon,
  UserAdd01Icon,
} from '@/components/icons/hugeicons';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { FilterChip } from '@/components/ui/FilterChip';
import { FilterSection, FilterSheet } from '@/components/ui/FilterSheet';
import { Screen } from '@/components/ui/Screen';
import { NotificationsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  type InboxPalette,
  inboxPalette,
} from '@/features/notifications/inboxPalette';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import { NotificationsHero } from '@/features/notifications/NotificationsHero';
import { NotificationTabs } from '@/features/notifications/NotificationTabs';
import {
  type AppNotification,
  dismissNotification,
  fetchNotifications,
  fetchUnreadByTab,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFilters,
  type NotificationState,
  type NotificationTab,
  NOTIFICATIONS_KEY,
  UNREAD_BY_TAB_KEY,
} from '@/features/notifications/notificationsApi';
import { useDebounced } from '@/lib/useDebounced';
import { spacing, useTheme, useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type EmptyTone = 'brand' | 'warning' | 'danger';

/** Live updates arrive as pushes; this covers phones with push turned off. */
const REFRESH_MS = 60_000;
/** How often "Due in N min" re-renders. */
const CLOCK_MS = 30_000;

const TABS: {
  key: NotificationTab;
  label: string;
  emptyTitle: string;
  emptyMessage: string;
  emptyIcon: HugeIconData;
  emptyTone: EmptyTone;
}[] = [
  {
    key: 'all',
    label: 'All',
    emptyTitle: "You're all caught up",
    emptyMessage:
      "Follow-up reminders and lead updates will appear here when there's something that needs your attention.",
    emptyIcon: Notification01Icon,
    emptyTone: 'brand',
  },
  {
    key: 'warn',
    label: 'Warn',
    emptyTitle: 'No upcoming deadlines',
    emptyMessage:
      "We'll flag follow-ups due in the next 15 minutes so you can act before they slip.",
    emptyIcon: CalendarClockIcon,
    emptyTone: 'warning',
  },
  {
    key: 'info',
    label: 'Info',
    emptyTitle: 'No new lead updates',
    emptyMessage:
      'New assignments, reassignments, and CRM updates will show up in this tab.',
    emptyIcon: UserAdd01Icon,
    emptyTone: 'brand',
  },
];

/** Not a pill: the Overdue filter opens this list. */
const OVERDUE_TAB: (typeof TABS)[number] = {
  key: 'urgent',
  label: 'Overdue',
  emptyTitle: 'Nothing overdue',
  emptyMessage:
    'Overdue follow-ups land here first — clear this list to stay on top of your pipeline.',
  emptyIcon: ClockAlertIcon,
  emptyTone: 'danger',
};

const HISTORY_EMPTY = {
  title: 'No resolved alerts yet',
  message:
    'Completed, rescheduled, and cleared follow-up alerts are kept here for reference.',
  icon: Bookmark02Icon as HugeIconData,
  tone: 'brand' as EmptyTone,
};

const NO_MATCH_EMPTY = {
  title: 'No matching notifications',
  message: 'Try another name, or clear the search and filters.',
  icon: Search02Icon as HugeIconData,
  tone: 'brand' as EmptyTone,
};

function emptyToneColors(colors: ThemeColors, tone: EmptyTone) {
  if (tone === 'warning') return { fg: colors.warning, bg: colors.warningSoft };
  if (tone === 'danger') return { fg: colors.danger, bg: colors.dangerSoft };
  return { fg: colors.brand, bg: colors.primary50 };
}

function NotificationEmpty({
  title,
  message,
  icon,
  tone,
}: {
  title: string;
  message: string;
  icon: HugeIconData;
  tone: EmptyTone;
}) {
  const colors = useThemeColors();
  const tint = emptyToneColors(colors, tone);

  return (
    <EmptyState
      title={title}
      message={message}
      iconBackgroundColor={tint.bg}
      iconElement={
        <HugeiconsIcon
          icon={icon}
          size={28}
          color={tint.fg}
          strokeWidth={1.5}
        />
      }
    />
  );
}

function routeFor(item: AppNotification): Href | null {
  const url = item.mobileUrl;
  if (url && /^\/leads\/\d+$/.test(url)) return url as Href;
  return null;
}

function NotificationList({
  tab,
  state,
  filters,
  live,
}: {
  tab: (typeof TABS)[number];
  state: NotificationState;
  filters: NotificationFilters;
  /** The page stays mounted as a tab; refresh only while it's on screen. */
  live: boolean;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [now, setNow] = useState(() => Date.now());
  const [dismissing, setDismissing] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(Date.now());
    // Right away too: the clock stood still while the page was out of view.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, CLOCK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [live]);

  const query = useInfiniteQuery({
    queryKey: [
      ...NOTIFICATIONS_KEY,
      'list',
      tab.key,
      state,
      filters.keyword ?? '',
      !!filters.unreadOnly,
    ],
    queryFn: ({ pageParam }) =>
      fetchNotifications(tab.key, state, pageParam, filters),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: live ? REFRESH_MS : false,
    // Each keystroke is a new key; keep the rows up until the answer lands.
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );

  const refreshAll = useCallback(
    () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    [queryClient]
  );

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSettled: refreshAll,
  });
  const dismiss = useMutation({
    mutationFn: dismissNotification,
    onSettled: refreshAll,
  });

  const onPressItem = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) markOne.mutate(item._id);
      const route = routeFor(item);
      if (route) router.push(route);
    },
    [markOne, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationCard
        item={item}
        now={now}
        linked={routeFor(item) !== null}
        onPress={onPressItem}
        onLongPress={setDismissing}
      />
    ),
    [now, onPressItem]
  );

  if (!query.data) {
    return (
      <QueryPlaceholder
        query={query}
        errorMessage={getErrorMessage(query.error)}
        skeleton={<NotificationsSkeleton />}
      />
    );
  }

  const empty =
    filters.keyword || filters.unreadOnly
      ? NO_MATCH_EMPTY
      : state === 'history'
        ? HISTORY_EMPTY
        : {
            title: tab.emptyTitle,
            message: tab.emptyMessage,
            icon: tab.emptyIcon,
            tone: tab.emptyTone,
          };

  return (
    <>
      <FlatList
        style={listStyles.list}
        contentContainerStyle={[
          listStyles.content,
          items.length === 0 && listStyles.emptyContent,
        ]}
        data={items}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              query.isRefetching &&
              !query.isFetchingNextPage &&
              !query.isPlaceholderData
            }
            onRefresh={() => {
              void refreshAll();
            }}
            tintColor={colors.brand}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        ListEmptyComponent={<NotificationEmpty {...empty} />}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand} style={listStyles.footer} />
          ) : undefined
        }
        renderItem={renderItem}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
      />
      <ConfirmModal
        open={!!dismissing}
        title="Dismiss notification?"
        message="It will be removed from your inbox."
        confirmLabel="Dismiss"
        onCancel={() => setDismissing(null)}
        onConfirm={() => {
          if (dismissing) dismiss.mutate(dismissing._id);
          setDismissing(null);
        }}
      />
    </>
  );
}

export default function NotificationsScreen() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = inboxPalette(isDark);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  // Tab inbox has no back; Settings → Notifications is a stack push.
  const showBack = pathname.startsWith('/settings');
  const [active, setActive] = useState<NotificationTab>('all');
  const [history, setHistory] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigation = useNavigation();

  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const keyword = useDebounced(search.trim());

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftUnread, setDraftUnread] = useState(false);
  const [draftOverdue, setDraftOverdue] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      return () => {
        setFocused(false);
        // Stack version: opening a lead must keep the active tab.
        if (showBack) return;
        // Coming back from another tab starts on All again; coming back
        // from a lead opened here keeps what the user was looking at.
        const { routes, index } = navigation.getState() ?? {};
        if (routes?.[index ?? 0]?.name !== 'notifications') {
          setActive('all');
          setHistory(false);
          setUnreadOnly(false);
          setSearchOpen(false);
          setSearch('');
        }
      };
    }, [navigation, queryClient, showBack])
  );

  // The hero is dark enough to need light icons in both themes.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  const { data: unread } = useQuery({
    queryKey: UNREAD_BY_TAB_KEY,
    queryFn: fetchUnreadByTab,
  });
  const hasUnread = !!unread && unread.all > 0;

  // Shares the Home dashboard cache, so this adds no extra request.
  const { data: dashboard } = useQuery(dashboardQuery);
  const summary = dashboard
    ? `${dashboard.kpis.todayFollowUps} due · ${dashboard.kpis.overdueFollowUps} overdue`
    : null;

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const overdue = active === 'urgent';
  const activeTab = overdue
    ? OVERDUE_TAB
    : (TABS.find((t) => t.key === active) ?? TABS[0]!);
  // Info rows never resolve, so only alert tabs have a history.
  const hasHistory = active !== 'info';
  const state: NotificationState = history && hasHistory ? 'history' : 'active';
  const filters = useMemo(
    () => ({ keyword, unreadOnly }),
    [keyword, unreadOnly]
  );

  const toggleSearch = () => {
    if (searchOpen) {
      setSearch('');
      searchRef.current?.blur();
    } else {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    setSearchOpen(!searchOpen);
  };

  const openFilter = () => {
    setDraftUnread(unreadOnly);
    setDraftOverdue(overdue);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setUnreadOnly(draftUnread);
    if (draftOverdue) setActive('urgent');
    else if (overdue) setActive('all');
    setFilterOpen(false);
  };

  return (
    <Screen
      header={
        <NotificationsHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
          onBack={showBack ? () => router.back() : undefined}
          searchOpen={searchOpen}
          search={search}
          searchRef={searchRef}
          onSearchChange={setSearch}
          onToggleSearch={toggleSearch}
          onOpenFilter={openFilter}
          filterCount={Number(unreadOnly) + Number(overdue)}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      <View style={styles.tabs}>
        <NotificationTabs
          tabs={TABS}
          unread={unread}
          active={overdue ? 'all' : active}
          onChange={setActive}
          right={
            <Pressable
              disabled={!hasHistory}
              onPress={() => setHistory((on) => !on)}
              accessibilityRole="button"
              accessibilityLabel="History"
              accessibilityState={{
                selected: state === 'history',
                disabled: !hasHistory,
              }}
              hitSlop={8}
              style={({ pressed }) => [
                !hasHistory && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={21}
                color={state === 'history' ? palette.accent : palette.ink}
              />
            </Pressable>
          }
        />
      </View>

      <NotificationList
        key={`${active}-${state}`}
        tab={activeTab}
        state={state}
        filters={filters}
        live={focused}
      />

      <FilterSheet
        open={filterOpen}
        title="Filter notifications"
        clearDisabled={!draftUnread && !draftOverdue}
        onClear={() => {
          setDraftUnread(false);
          setDraftOverdue(false);
        }}
        onApply={applyFilter}
        onClose={() => setFilterOpen(false)}
      >
        <FilterSection title="Show only">
          <FilterChip
            label="Unread"
            active={draftUnread}
            onPress={() => setDraftUnread((on) => !on)}
          />
          <FilterChip
            label="Overdue"
            active={draftOverdue}
            onPress={() => setDraftOverdue((on) => !on)}
          />
        </FilterSection>
        <FilterSection title="Inbox" chips={false}>
          <Button
            title="Mark all as read"
            variant="secondary"
            disabled={!hasUnread}
            loading={markAll.isPending}
            onPress={() => {
              markAll.mutate();
              setFilterOpen(false);
            }}
          />
        </FilterSection>
      </FilterSheet>
    </Screen>
  );
}

const listStyles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: 5,
  },
  emptyContent: { flexGrow: 1 },
  footer: { paddingVertical: spacing.lg },
});

function createStyles(palette: InboxPalette) {
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
    },
    disabled: { opacity: 0.35 },
    pressed: { opacity: 0.7 },
  });
}
