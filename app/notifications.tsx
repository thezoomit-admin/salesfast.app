import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { NotificationsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import { NotificationTabs } from '@/features/notifications/NotificationTabs';
import {
  type AppNotification,
  dismissNotification,
  fetchNotifications,
  fetchUnreadByTab,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationTab,
  type NotificationState,
  NOTIFICATIONS_KEY,
  UNREAD_BY_TAB_KEY,
} from '@/features/notifications/notificationsApi';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatDayHeading } from '@/utils/dates';

/** Live updates arrive as pushes; this covers phones with push turned off. */
const REFRESH_MS = 60_000;
/** How often "Due in N min" re-renders. */
const CLOCK_MS = 30_000;

const TABS: {
  key: NotificationTab;
  label: string;
  emptyTitle: string;
  emptyMessage: string;
}[] = [
  {
    key: 'all',
    label: 'All',
    emptyTitle: 'No notifications yet',
    emptyMessage: 'Follow-up alerts and lead updates will show up here.',
  },
  {
    key: 'warn',
    label: 'Warn',
    emptyTitle: 'No warnings',
    emptyMessage: 'Follow-ups due within 15 minutes will show up here.',
  },
  {
    key: 'urgent',
    label: 'Urgent',
    emptyTitle: 'Nothing urgent',
    emptyMessage: 'Overdue follow-ups will show up here.',
  },
  {
    key: 'info',
    label: 'Info',
    emptyTitle: 'No notifications yet',
    emptyMessage: 'New lead assignments and updates will show up here.',
  },
];

type DaySection = { title: string; data: AppNotification[] };

/** `items` arrive newest first, so each day is one contiguous run. */
function groupByDay(items: AppNotification[]) {
  const sections: DaySection[] = [];
  for (const item of items) {
    const title = formatDayHeading(item.createdAt);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.data.push(item);
    else sections.push({ title, data: [item] });
  }
  return sections;
}

function routeFor(item: AppNotification): Href | null {
  const url = item.mobileUrl;
  if (url && /^\/leads\/\d+$/.test(url)) return url as Href;
  return null;
}

function NotificationList({
  tab,
  state,
}: {
  tab: (typeof TABS)[number];
  state: NotificationState;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [now, setNow] = useState(() => Date.now());
  const [dismissing, setDismissing] = useState<AppNotification | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(id);
  }, []);

  const query = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', tab.key, state],
    queryFn: ({ pageParam }) => fetchNotifications(tab.key, state, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: REFRESH_MS,
  });

  const sections = useMemo(
    () => groupByDay(query.data?.pages.flatMap((p) => p.items) ?? []),
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
        onPress={onPressItem}
        onLongPress={setDismissing}
      />
    ),
    [now, onPressItem]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: DaySection }) => (
      <Text style={styles.sectionTitle}>{section.title}</Text>
    ),
    [styles]
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

  const history = state === 'history';

  return (
    <>
      <SectionList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          sections.length === 0 && styles.emptyContent,
        ]}
        sections={sections}
        keyExtractor={(item) => item._id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
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
        ListEmptyComponent={
          <EmptyState
            title={history ? 'No history yet' : tab.emptyTitle}
            message={
              history
                ? 'Alerts for finished follow-ups are kept here.'
                : tab.emptyMessage
            }
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand} style={styles.footer} />
          ) : undefined
        }
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [active, setActive] = useState<NotificationTab>('urgent');
  const [history, setHistory] = useState(false);

  const { data: unread } = useQuery({
    queryKey: UNREAD_BY_TAB_KEY,
    queryFn: fetchUnreadByTab,
    refetchInterval: REFRESH_MS,
  });
  const hasUnread = !!unread && unread.all > 0;

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0]!;
  // Info rows never resolve, so only alert tabs have a history.
  const hasHistory = active !== 'info';
  const state: NotificationState = history && hasHistory ? 'history' : 'active';

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Notifications"
        backIcon="chevron-back"
        titleCentered={false}
        flush
        right={
          <Pressable
            disabled={!hasUnread || markAll.isPending}
            onPress={() => markAll.mutate()}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasUnread }}
            hitSlop={8}
            style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
          >
            <Text
              style={[styles.markAllText, !hasUnread && styles.markAllDisabled]}
              numberOfLines={1}
            >
              Mark all as read
            </Text>
          </Pressable>
        }
      />

      <NotificationTabs
        tabs={TABS}
        unread={unread}
        active={active}
        onChange={setActive}
        right={
          hasHistory ? (
            <Pressable
              onPress={() => setHistory((on) => !on)}
              accessibilityRole="button"
              accessibilityLabel="History"
              accessibilityState={{ selected: state === 'history' }}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={state === 'history' ? colors.brand : colors.textMuted}
              />
            </Pressable>
          ) : null
        }
      />

      <NotificationList
        key={`${active}-${state}`}
        tab={activeTab}
        state={state}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    list: { flex: 1 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    emptyContent: { flexGrow: 1 },
    sectionTitle: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xs,
    },
    footer: { paddingVertical: spacing.lg },
    markAll: {
      minHeight: 40,
      justifyContent: 'center',
    },
    markAllText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    markAllDisabled: { color: colors.textMuted },
    pressed: { opacity: 0.7 },
  });
}
