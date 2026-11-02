import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
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
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import {
  type AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_KEY,
} from '@/features/notifications/notificationsApi';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatRelative } from '@/utils/dates';

type IconName = React.ComponentProps<typeof FontAwesome>['name'];

const ICONS: Record<string, IconName> = {
  LEAD_ASSIGNED: 'user-plus',
  LEAD_ASSIGNMENT_ACTIVITY: 'exchange',
  LEAD_REASSIGNED_AWAY: 'share',
  LEAD_UNASSIGNED: 'exclamation-circle',
  FOLLOW_UP_REMINDER: 'clock-o',
  PROPOSAL_RESPONSE_REMINDER: 'file-text-o',
  CONTRACT_EXPIRY: 'calendar-times-o',
  WEBSITE_LEAD: 'globe',
  FACEBOOK_LEAD: 'facebook',
  FACEBOOK_CSV_IMPORT_LEAD: 'facebook',
  WHATSAPP_LEAD: 'whatsapp',
};

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

  const onPressItem = (item: AppNotification) => {
    if (!item.isRead) markOne.mutate(item._id);
    const route = routeFor(item);
    if (route) router.push(route);
  };

  const header = (
    <ScreenHeader
      title="Notifications"
      right={
        unread > 0 ? (
          <Pressable
            onPress={() => markAll.mutate()}
            disabled={markAll.isPending}
            hitSlop={8}
            style={styles.headerActionBtn}
          >
            <Text style={styles.headerAction}>
              {markAll.isPending ? 'Marking…' : 'Mark all'}
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
        />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      {header}
      <FlatList
        style={styles.list}
        contentContainerStyle={items.length ? styles.content : styles.emptyContent}
        data={items}
        keyExtractor={(item) => item._id}
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
        renderItem={({ item }) => {
          const type = item.metadata?.crmType ?? '';
          const linked = !!routeFor(item);
          return (
            <Pressable
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [
                styles.row,
                !item.isRead && styles.rowUnread,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.icon, !item.isRead && styles.iconUnread]}>
                <FontAwesome
                  name={ICONS[type] ?? 'bell'}
                  size={16}
                  color={item.isRead ? colors.textSecondary : colors.brand}
                />
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text
                    style={[styles.title, !item.isRead && styles.titleUnread]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  {!item.isRead ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.message} numberOfLines={3}>
                  {item.message}
                </Text>
                <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
              </View>
              {linked ? (
                <FontAwesome
                  name="angle-right"
                  size={18}
                  color={colors.textMuted}
                  style={styles.chevron}
                />
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    content: { padding: spacing.lg, gap: spacing.sm },
    emptyContent: { flexGrow: 1 },
    footer: { paddingVertical: spacing.lg },
    headerActionBtn: {
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    headerAction: { ...typography.caption, color: colors.brand, fontWeight: '700' },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
    pressed: { opacity: 0.75 },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    iconUnread: { backgroundColor: colors.surface },
    body: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.subtitle, fontSize: 15, color: colors.text, flexShrink: 1 },
    titleUnread: { fontWeight: '700' },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
    },
    message: { ...typography.body, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    time: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    chevron: { alignSelf: 'center' },
  });
}
