import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  DayGroupHeader,
  LeadSectionShell,
} from '@/components/leads/LeadSectionShell';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { groupByDay, timeOf } from '@/features/leads/dayGroups';
import { formatViewDuration } from '@/features/leads/leadActivity';
import { fetchLeadViews } from '@/features/leads/leadsApi';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

type Props = { leadId: number };
type ViewTab = 'all' | 'live';
const PAGE_SIZE = 30;

export function LeadViewHistoryPanel({ leadId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<ViewTab>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const query = useQuery({
    queryKey: ['lead-views', leadId, limit],
    queryFn: () => fetchLeadViews(leadId, limit),
    enabled: Number.isFinite(leadId),
  });

  if (query.isLoading && !query.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ErrorState
        message={getErrorMessage(query.error, 'Could not load view history')}
      />
    );
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const liveCount = query.data?.liveCount ?? 0;
  const firstViewId = query.data?.firstViewId ?? null;
  const hasMore = Boolean(query.data?.hasMore);
  const filtered = tab === 'live' ? items.filter((v) => v.isLive) : items;
  const groups = groupByDay(filtered, (v) => v.viewedAt);

  return (
    <LeadSectionShell
      pills={[
        { key: 'all', label: 'All Views', count: total },
        { key: 'live', label: 'Live', count: liveCount },
      ]}
      activeKey={tab}
      onPillChange={(k) => {
        setTab(k as ViewTab);
        setLimit(PAGE_SIZE);
      }}
    >
      {!filtered.length ? (
        <EmptyState
          title={tab === 'live' ? 'Nobody live' : 'No views yet'}
          message={
            tab === 'live'
              ? 'No one is viewing this lead right now.'
              : 'When someone opens this lead, visits show up here.'
          }
        />
      ) : (
        <View>
          {groups.map((g) => (
            <View key={g.key}>
              <DayGroupHeader label={g.label} />
              {g.items.map((v) => (
                <View key={v.id} style={styles.row}>
                  <View
                    style={[
                      styles.avatar,
                      v.isLive ? styles.avatarLive : styles.avatarIdle,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={v.isLive ? colors.danger : colors.brand}
                    />
                  </View>
                  <View style={styles.main}>
                    <View style={styles.header}>
                      <View style={styles.left}>
                        <View style={styles.nameRow}>
                          <Text style={styles.name} numberOfLines={1}>
                            {v.userName?.trim() || 'Unknown user'}
                          </Text>
                          {v.isLive ? (
                            <View style={styles.liveBadge}>
                              <Text style={styles.liveText}>Live</Text>
                            </View>
                          ) : null}
                          {v.id === firstViewId ? (
                            <View style={styles.firstBadge}>
                              <Text style={styles.firstText}>First view</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.meta}>
                          {formatViewDuration(v.durationSeconds)}
                        </Text>
                      </View>
                      <Text style={styles.time}>{timeOf(v.viewedAt)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
          {tab === 'all' && hasMore ? (
            <Pressable
              style={styles.moreBtn}
              onPress={() =>
                setLimit((n) => Math.min(n + PAGE_SIZE, 500))
              }
            >
              <Text style={styles.moreText}>
                {query.isFetching ? 'Loading…' : 'View more'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </LeadSectionShell>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    loading: { paddingVertical: spacing.xl, alignItems: 'center' },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      alignItems: 'flex-start',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarIdle: {
      backgroundColor: colors.primary50,
    },
    avatarLive: {
      backgroundColor: colors.dangerSoft,
    },
    main: { flex: 1, minWidth: 0 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    left: { flex: 1, minWidth: 0, gap: 2 },
    nameRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    name: { ...typography.body, fontWeight: '600', color: colors.text },
    meta: { ...typography.caption, color: colors.textSecondary },
    time: { ...typography.caption, color: colors.textMuted },
    liveBadge: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    liveText: {
      ...typography.caption,
      color: colors.danger,
      fontWeight: '700',
      fontSize: 10,
    },
    firstBadge: {
      backgroundColor: colors.successSoft,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    firstText: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '700',
      fontSize: 10,
    },
    moreBtn: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    moreText: { ...typography.body, fontWeight: '600', color: colors.text },
  });
}
