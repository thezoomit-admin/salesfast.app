import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { LeadListItemCard } from '@/components/leads/LeadListItemCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import {
  followUpLeadsQuery,
  type FollowUpTab,
} from '@/features/leads/leadsApi';
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

export default function FollowUpsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [tab, setTab] = useState<FollowUpTab>('today');

  const query = useQuery(followUpLeadsQuery(tab));
  const empty = EMPTY_COPY[tab];

  const openLead = useCallback(
    (lead: LeadListItem) => router.push(`/leads/${lead.id}`),
    [router]
  );
  const renderLead = useCallback(
    ({ item }: { item: LeadListItem }) => (
      <LeadListItemCard lead={item} onPress={openLead} />
    ),
    [openLead]
  );

  const count = query.data?.items.length;
  const headerSubtitle =
    count == null
      ? 'Today · Overdue · Upcoming'
      : count === 0
        ? EMPTY_COPY[tab].title
        : `${count} in ${tab === 'today' ? 'Today' : tab === 'overdue' ? 'Overdue' : 'Upcoming'}`;

  return (
    <View style={styles.safe}>
      <ScreenHeader
        title="Follow-ups"
        subtitle={headerSubtitle}
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
              onAction={() => router.push('/(tabs)/leads')}
            />
          }
          renderItem={renderLead}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

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
