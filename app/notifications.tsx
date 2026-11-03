import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { NotificationsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import {
  type AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_KEY,
} from '@/features/notifications/notificationsApi';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

function routeFor(item: AppNotification): Href | null {
  const url = item.mobileUrl;
  if (url && /^\/leads\/\d+$/.test(url)) return url as Href;
  return null;
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list'],
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.lastPage ? last.page + 1 : undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );
  const unread = query.data?.pages[0]?.unread ?? 0;

  const refreshAll = () =>
    queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSettled: refreshAll,
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
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
      <NotificationCard item={item} onPress={onPressItem} />
    ),
    [onPressItem]
  );

  const header = (
    <ScreenHeader
      title="Notifications"
      right={
        unread > 0 ? (
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            hitSlop={8}
            style={({ pressed }) => [
              styles.markAllBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.markAllText}>
              {markAll.isPending ? 'Marking…' : 'Mark all read'}
            </Text>
          </Pressable>
        ) : null
      }
    />
  );

  if (!query.data) {
    return (
      <View style={styles.safe}>
        {header}
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<NotificationsSkeleton />}
        />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={[
          styles.content,
          items.length === 0 && styles.emptyContent,
        ]}
        data={items}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => {
              void query.refetch();
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
            title="No notifications yet"
            message="New lead assignments and reminders will show up here."
          />
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand} style={styles.footer} />
          ) : undefined
        }
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: 12,
      paddingBottom: spacing.xl,
    },
    emptyContent: { flexGrow: 1 },
    footer: { paddingVertical: spacing.lg },
    markAllBtn: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    markAllText: {
      ...typography.caption,
      color: colors.brand,
      fontWeight: '700',
    },
    pressed: { opacity: 0.7 },
  });
}
