import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { CountTab } from '@/components/ui/CountTab';
import { HeaderIconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { NotificationsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { NotificationCard } from '@/features/notifications/NotificationCard';
import {
  type AppNotification,
  fetchNotifications,
  fetchUnreadByCategory,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationCategory,
  NOTIFICATIONS_KEY,
  UNREAD_BY_CATEGORY_KEY,
} from '@/features/notifications/notificationsApi';
import {
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import { formatDayHeading } from '@/utils/dates';

const TABS: {
  key: NotificationCategory;
  label: string;
  emptyTitle: string;
  emptyMessage: string;
}[] = [
  {
    key: 'warn',
    label: 'Warn',
    emptyTitle: 'No warnings',
    emptyMessage: 'Follow-ups due within 12 hours will show up here.',
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

function NotificationList({ tab }: { tab: (typeof TABS)[number] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', tab.key],
    queryFn: ({ pageParam }) => fetchNotifications(tab.key, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.lastPage ? last.page + 1 : undefined,
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

  return (
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
        <EmptyState title={tab.emptyTitle} message={tab.emptyMessage} />
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
  );
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<NotificationCategory>('warn');
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: UNREAD_BY_CATEGORY_KEY,
    queryFn: fetchUnreadByCategory,
  });
  const hasUnread =
    !!unread && unread.warn + unread.urgent + unread.info > 0;

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });

  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0]!;

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Notifications"
        backIcon="chevron-back"
        right={
          <HeaderIconButton
            label="More options"
            onPress={() => setMenuOpen(true)}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </HeaderIconButton>
        }
      />

      <View accessibilityRole="tablist" style={styles.tabs}>
        {TABS.map((tab) => (
          <CountTab
            key={tab.key}
            label={tab.label}
            count={unread?.[tab.key] || undefined}
            active={tab.key === active}
            onPress={() => setActive(tab.key)}
          />
        ))}
      </View>

      <NotificationList key={active} tab={activeTab} />

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMenuOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
        <View style={[styles.menu, { top: insets.top + 52 }]}>
          <Pressable
            disabled={!hasUnread || markAll.isPending}
            onPress={() => {
              setMenuOpen(false);
              markAll.mutate();
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasUnread }}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={hasUnread ? colors.text : colors.textMuted}
            />
            <Text
              style={[styles.menuLabel, !hasUnread && styles.menuLabelDisabled]}
            >
              Mark all as read
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.surface },
    tabs: {
      flexDirection: 'row',
      gap: 20,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xs,
    },
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
    menu: {
      position: 'absolute',
      right: spacing.lg,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: colors.black,
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44,
      paddingHorizontal: 14,
    },
    menuLabel: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.text,
    },
    menuLabelDisabled: { color: colors.textMuted },
    pressed: { opacity: 0.7 },
  });
}
