import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { ChipScroll } from '@/components/ui/ChipScroll';
import { CountTab, CountTabDivider } from '@/components/ui/CountTab';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActivitiesSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { ActivityRow } from '@/features/activities/ActivityRow';
import {
  describeActivity,
  type ActivityFilter,
} from '@/features/activities/activityDisplay';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { groupByDay } from '@/features/leads/dayGroups';
import { spacing, useTheme, type ThemeColors } from '@/theme';

const FILTERS: {
  key: ActivityFilter;
  label: string;
  emptyTitle: string;
  emptyMessage: string;
}[] = [
  {
    key: 'all',
    label: 'All',
    emptyTitle: 'No recent activities',
    emptyMessage: 'Notes you add on leads will show up here.',
  },
  {
    key: 'call',
    label: 'Calls',
    emptyTitle: 'No recent calls',
    emptyMessage: 'Calls with your leads will show up here.',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    emptyTitle: 'No recent WhatsApp notes',
    emptyMessage: 'Notes logged on the WhatsApp channel will show up here.',
  },
  {
    key: 'note',
    label: 'Notes',
    emptyTitle: 'No recent notes',
    emptyMessage: 'Notes you add on leads will show up here.',
  },
];

export default function ActivitiesScreen() {
  const { colors, resolved } = useTheme();
  const pageWash = resolved === 'dark' ? colors.background : '#EEF1F4';
  const styles = useMemo(() => createStyles(colors, pageWash), [colors, pageWash]);
  const router = useRouter();
  const query = useQuery(dashboardQuery);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const activities = useMemo(
    () =>
      (query.data?.recentNotes ?? []).map((note) => ({
        note,
        view: describeActivity(note),
      })),
    [query.data]
  );

  const days = useMemo(
    () =>
      groupByDay(
        activities.filter((a) => filter === 'all' || a.view.filter === filter),
        (a) => a.note.createdAt
      ),
    [activities, filter]
  );

  const onOpen = useCallback(
    (leadId: number) => router.push(`/leads/${leadId}`),
    [router]
  );

  const countOf = (key: ActivityFilter) => {
    if (!query.data) return undefined;
    if (key === 'all') return activities.length;
    return activities.filter((a) => a.view.filter === key).length;
  };

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]!;

  return (
    <View style={styles.safe}>
      <View style={styles.top}>
        <ScreenHeader title="Activities" />
        <ChipScroll style={styles.tabs} contentContainerStyle={styles.tabsContent}>
          {FILTERS.map((f) => (
            <View key={f.key} style={styles.tabSlot}>
              <CountTab
                label={f.label}
                count={countOf(f.key)}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
              {f.key === 'all' ? <CountTabDivider /> : null}
            </View>
          ))}
        </ChipScroll>
      </View>

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<ActivitiesSkeleton />}
        />
      ) : (
        <FlatList
          // A new tab starts at the top instead of the old tab's scroll offset.
          key={filter}
          data={days}
          keyExtractor={(day) => day.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState
              title={activeFilter.emptyTitle}
              message={activeFilter.emptyMessage}
            />
          }
          ListFooterComponent={
            days.length > 0 ? (
              <Text style={styles.footer}>
                Latest activity from your assigned leads
              </Text>
            ) : undefined
          }
          renderItem={({ item: day }) => (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>{day.label}</Text>
                <Text style={styles.panelCount}>{day.items.length}</Text>
              </View>
              {day.items.map(({ note, view }, i) => (
                <ActivityRow
                  key={note.id}
                  leadId={note.leadId}
                  leadName={note.leadName}
                  addedByName={note.addedByName}
                  createdAt={note.createdAt}
                  view={view}
                  last={i === day.items.length - 1}
                  onOpen={onOpen}
                />
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, pageWash: string) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: pageWash },
    top: { backgroundColor: colors.surface },
    tabs: { marginBottom: spacing.sm },
    tabsContent: { gap: spacing.md },
    tabSlot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    list: {
      flexGrow: 1,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
    },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      gap: 12,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    panelTitle: {
      flex: 1,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
    },
    panelCount: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: colors.textMuted,
    },
    footer: {
      fontSize: 12,
      lineHeight: 16,
      textAlign: 'center',
      color: colors.textMuted,
      paddingVertical: spacing.sm,
    },
  });
}
