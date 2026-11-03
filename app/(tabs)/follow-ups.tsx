import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { useLeadCardSheets } from '@/components/leads/useLeadCardSheets';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LeadListSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import {
  followUpLeadsQuery,
  type FollowUpTab,
} from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { LeadListItem } from '@/types/api';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

const EMPTY_COPY: Record<
  FollowUpTab,
  { icon: 'sunny-outline' | 'alert-circle-outline' | 'calendar-outline'; title: string; message: string }
> = {
  today: {
    icon: 'sunny-outline',
    title: 'All clear for today',
    message: 'No follow-ups due today. Check overdue or schedule the next touch.',
  },
  overdue: {
    icon: 'alert-circle-outline',
    title: 'Nothing overdue',
    message: 'You’re caught up — no missed follow-ups waiting.',
  },
  upcoming: {
    icon: 'calendar-outline',
    title: 'No upcoming follow-ups',
    message: 'Nothing scheduled ahead. Open a lead to set the next reminder.',
  },
};

const NO_LEADS: LeadListItem[] = [];

function FollowUpsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [tab, setTab] = useState<FollowUpTab>('today');

  const query = useQuery(followUpLeadsQuery(tab));
  const empty = EMPTY_COPY[tab];

  const { openLead, prefetchLead } = useLeadRowHandlers(
    query.data?.items ?? NO_LEADS
  );
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

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Follow-ups"
        showBack={false}
        right={<NotificationBell plain />}
      />
      <View style={styles.tabs}>
        {(
          [
            ['today', 'Today'],
            ['overdue', 'Overdue'],
            ['upcoming', 'Upcoming'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<LeadListSkeleton />}
        />
      ) : (
        <FlatList
          data={query.data.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon={empty.icon}
              title={empty.title}
              message={empty.message}
              actionLabel="Browse leads"
              onAction={() => router.navigate('/(tabs)/leads')}
            />
          }
          renderItem={renderLead}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}

      {sheets}
    </View>
  );
}

export default memo(FollowUpsScreen);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginVertical: 10,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    tabText: { ...typography.caption, color: colors.textSecondary },
    tabTextActive: { color: colors.white },
    list: {
      paddingHorizontal: spacing.lg,
      paddingTop: 0,
      paddingBottom: spacing.lg,
      gap: spacing.md,
      flexGrow: 1,
    },
  });
}
