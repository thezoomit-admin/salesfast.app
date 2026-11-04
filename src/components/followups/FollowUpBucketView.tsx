import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns/format';
import { isThisYear } from 'date-fns/isThisYear';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { isYesterday } from 'date-fns/isYesterday';
import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  dayKey,
  kindTones,
  useMinuteClock,
  type DayFollowUp,
} from '@/components/followups/followUpCalendar';
import { FollowUpItemCard } from '@/components/followups/FollowUpCard';
import { FollowUpEmpty } from '@/components/followups/FollowUpEmpty';
import { QueryPlaceholder } from '@/components/ui/StateViews';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { leadRowOfFollowUp } from '@/features/leads/leadDetailCache';
import { followUpBucketQuery, type FollowUpBucket } from '@/features/leads/leadsApi';
import { useLeadRowHandlers } from '@/features/leads/useLeadDetail';
import type { MyFollowUp } from '@/types/api';
import { useTheme, type ThemeColors } from '@/theme';

type Section = { key: string; title: string; data: DayFollowUp[] };

type Props = {
  bucket: FollowUpBucket;
  tabs: ReactNode;
  onMore: (item: MyFollowUp) => void;
  onComplete: (item: MyFollowUp) => void;
};

function dayTitle(day: Date) {
  if (isToday(day)) return 'Today';
  if (isYesterday(day)) return 'Yesterday';
  if (isTomorrow(day)) return 'Tomorrow';
  return format(day, isThisYear(day) ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

/** One section per day, in the order the server sorted the rows. */
function toSections(items: readonly MyFollowUp[]) {
  const sections: Section[] = [];
  for (const item of items) {
    const due = new Date(item.dueAt);
    const key = dayKey(due);
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push({ item, due });
    else sections.push({ key, title: dayTitle(due), data: [{ item, due }] });
  }
  return sections;
}

/** Everything overdue or upcoming across all dates, unlike the one-day timeline. */
function FollowUpBucketViewImpl({ bucket, tabs, onMore, onComplete }: Props) {
  const { colors, resolved } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(resolved === 'dark'), [resolved]);
  const now = useMinuteClock();
  const [pulling, setPulling] = useState(false);

  const query = useInfiniteQuery(followUpBucketQuery(bucket));
  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );
  const sections = useMemo(() => toSections(items), [items]);
  const leadRows = useMemo(() => items.map(leadRowOfFollowUp), [items]);
  const { openLead, prefetchLead } = useLeadRowHandlers(leadRows);

  const onOpen = useCallback((f: MyFollowUp) => openLead(leadRowOfFollowUp(f)), [openLead]);
  const onPressIn = useCallback(
    (f: MyFollowUp) => prefetchLead(leadRowOfFollowUp(f)),
    [prefetchLead]
  );

  const onRefresh = async () => {
    setPulling(true);
    await query.refetch();
    setPulling(false);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Follow-ups" showBack={false} />
      {tabs}
      {query.data ? (
        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={({ item }) => String(item.id)}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayTitle}>{section.title}</Text>
          )}
          renderItem={({ item: { item, due } }) => (
            <View style={styles.row}>
              <FollowUpItemCard
                item={item}
                due={due}
                now={now}
                tones={tones}
                onOpen={onOpen}
                onPressIn={onPressIn}
                onMore={onMore}
                onComplete={onComplete}
              />
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => void onRefresh()}
              tintColor={colors.brand}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          ListEmptyComponent={<FollowUpEmpty kind={bucket} />}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.brand} style={styles.footer} />
            ) : undefined
          }
          initialNumToRender={8}
          windowSize={7}
        />
      ) : (
        <QueryPlaceholder query={query} errorMessage={getErrorMessage(query.error)} />
      )}
    </View>
  );
}

export const FollowUpBucketView = memo(FollowUpBucketViewImpl);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    list: {
      flex: 1,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    listContent: { flexGrow: 1, paddingBottom: 24 },
    dayTitle: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      backgroundColor: colors.surface,
    },
    row: { paddingHorizontal: 16, paddingBottom: 10 },
    footer: { paddingVertical: 16 },
  });
}
