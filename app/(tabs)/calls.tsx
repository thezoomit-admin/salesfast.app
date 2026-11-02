import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import type { CallSyncDirection } from '@/features/call-tracking/callSyncApi';
import { runCallSync } from '@/features/call-tracking/runCallSync';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import {
  isMissed,
  RECENT_CALLS_KEY,
  requestCallLogPermission,
  useRecentCalls,
  type RecentCall,
} from '@/features/call-tracking/useRecentCalls';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer } from '@/utils/phone';

type FilterKey = 'leads' | 'missed' | 'others';

const FILTERS: readonly (readonly [FilterKey, string])[] = [
  ['leads', 'Lead calls'],
  ['missed', 'Missed'],
  ['others', 'Unknown'],
];

const DIRECTION_ICON: Record<
  CallSyncDirection,
  { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }
> = {
  INCOMING: { name: 'arrow-down', color: colors.success },
  OUTGOING: { name: 'arrow-up', color: colors.brand },
  MISSED: { name: 'times', color: colors.danger },
  REJECTED: { name: 'ban', color: colors.danger },
  UNKNOWN: { name: 'phone', color: colors.textMuted },
};

function formatDuration(sec: number) {
  if (sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CallsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const callSync = useCallSyncStatus();
  const [filter, setFilter] = useState<FilterKey>('leads');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const setupDone = Boolean(callSync.prefs?.consentedAt && callSync.prefs?.enabled);
  const calls = useRecentCalls(setupDone);

  const refreshSync = callSync.refresh;
  const refetchCalls = calls.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshSync();
      if (setupDone) void refetchCalls();
    }, [refreshSync, setupDone, refetchCalls])
  );

  const data = calls.data?.state === 'ok' ? calls.data : null;

  const visible = useMemo(() => {
    if (!data) return [];
    return data.calls.filter((c) => {
      if (filter === 'leads') return c.leadId != null;
      if (filter === 'missed') return c.leadId != null && isMissed(c.direction);
      return c.leadId == null;
    });
  }, [data, filter]);

  // Missed lead calls in the 24h before the call log was last read.
  const loadedAt = calls.dataUpdatedAt;
  const missedCount = useMemo(
    () =>
      data?.calls.filter(
        (c) =>
          c.leadId != null &&
          isMissed(c.direction) &&
          loadedAt - c.startedAt.getTime() < 24 * 60 * 60 * 1000
      ).length ?? 0,
    [data, loadedAt]
  );

  const syncNow = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await runCallSync({ force: true });
      setSyncMessage(result.message);
      await Promise.all([
        callSync.refresh(),
        queryClient.invalidateQueries({ queryKey: RECENT_CALLS_KEY }),
        queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] }),
      ]);
    } catch (error) {
      setSyncMessage(getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  const grantPermission = async () => {
    const granted = await requestCallLogPermission();
    if (granted) {
      await queryClient.invalidateQueries({ queryKey: RECENT_CALLS_KEY });
    } else {
      setSyncMessage('Call log permission was denied.');
    }
  };

  const syncOk = callSync.status === 'configured';

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Calls</Text>
      <Pressable
        style={[styles.syncCard, syncOk ? styles.syncCardOk : styles.syncCardWarn]}
        onPress={() => router.push('/call-sync/setup')}
      >
        <View
          style={[
            styles.syncDot,
            { backgroundColor: syncOk ? colors.success : colors.warning },
          ]}
        />
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle}>Call sync · {callSync.label}</Text>
          <Text style={styles.syncBody} numberOfLines={2}>
            {syncMessage ?? callSync.message}
          </Text>
        </View>
        <FontAwesome name="cog" size={16} color={colors.textMuted} />
      </Pressable>
      {syncOk ? (
        <Button
          title="Sync now"
          variant="secondary"
          loading={syncing}
          onPress={syncNow}
        />
      ) : null}
    </View>
  );

  if (callSync.loading && !callSync.prefs) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  if (!setupDone) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        {header}
        <EmptyState
          title="Set up call sync"
          message="Match your phone calls with CRM leads. Only calls with your leads are saved to the CRM."
        />
        <View style={styles.cta}>
          <Button
            title="Start setup"
            onPress={() => router.push('/call-sync/setup')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {header}

      {calls.isLoading ? (
        <LoadingState label="Reading call history…" />
      ) : calls.isError ? (
        <ErrorState
          message={getErrorMessage(calls.error)}
          onRetry={() => calls.refetch()}
        />
      ) : calls.data?.state === 'unsupported' ? (
        <EmptyState
          title="Call history not available"
          message="Call history is shown in the SalesFast Android app (development or production build). Expo Go and web cannot read it."
        />
      ) : calls.data?.state === 'no_permission' ? (
        <View style={styles.flex}>
          <EmptyState
            title="Permission needed"
            message="Allow call log access to see recent calls with your leads."
          />
          <View style={styles.cta}>
            <Button title="Allow access" onPress={grantPermission} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.tabs}>
            {FILTERS.map(([key, label]) => {
              const active = filter === key;
              const showBadge = key === 'missed' && missedCount > 0;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {label}
                    {showBadge ? ` (${missedCount})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <FlatList
            data={visible}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.list}
            refreshing={calls.isRefetching}
            onRefresh={() => calls.refetch()}
            ListEmptyComponent={
              <EmptyState
                title={
                  filter === 'missed'
                    ? 'No missed lead calls'
                    : filter === 'others'
                      ? 'No unknown numbers'
                      : 'No lead calls yet'
                }
                message={
                  filter === 'others'
                    ? 'Calls with numbers that are not in your leads show here. They are never uploaded.'
                    : `Watching ${data?.watchedCount ?? 0} lead numbers.`
                }
              />
            }
            renderItem={({ item }) => (
              <CallRow
                call={item}
                onOpenLead={
                  item.leadId != null
                    ? () => router.push(`/leads/${item.leadId}`)
                    : undefined
                }
              />
            )}
          />
        </>
      )}
    </View>
  );
}

function CallRow({
  call,
  onOpenLead,
}: {
  call: RecentCall;
  onOpenLead?: () => void;
}) {
  const icon = DIRECTION_ICON[call.direction];
  const missed = isMissed(call.direction);
  const duration = formatDuration(call.durationSec);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && onOpenLead && styles.pressed]}
      onPress={onOpenLead}
      disabled={!onOpenLead}
    >
      <View style={[styles.dirIcon, missed && styles.dirIconMissed]}>
        <FontAwesome name={icon.name} size={13} color={icon.color} />
      </View>
      <View style={styles.cardCopy}>
        <Text
          style={[styles.name, missed && styles.nameMissed]}
          numberOfLines={1}
        >
          {call.leadName || formatPhoneDisplay(call.phone)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {call.leadName ? `${formatPhoneDisplay(call.phone)} · ` : ''}
          {formatDate(call.startedAt)}
          {duration ? ` · ${duration}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => void openPhoneDialer(call.phone)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Call ${call.leadName || call.phone}`}
        style={({ pressed }) => [
          styles.callBtn,
          missed && styles.callBtnMissed,
          pressed && styles.pressed,
        ]}
      >
        <FontAwesome
          name="phone"
          size={16}
          color={missed ? colors.white : colors.brand}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  cta: { paddingHorizontal: spacing.lg },
  pressed: { opacity: 0.8 },

  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  syncCardOk: { backgroundColor: colors.successSoft, borderColor: colors.successSoft },
  syncCardWarn: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  syncDot: { width: 10, height: 10, borderRadius: radii.pill },
  syncCopy: { flex: 1, gap: 2 },
  syncTitle: { ...typography.subtitle, color: colors.text, fontSize: 14 },
  syncBody: { ...typography.caption, color: colors.textSecondary },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
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

  list: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dirIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  dirIconMissed: { backgroundColor: colors.dangerSoft },
  cardCopy: { flex: 1, gap: 2 },
  name: { ...typography.subtitle, color: colors.text },
  nameMissed: { color: colors.danger },
  meta: { ...typography.caption, color: colors.textMuted },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  callBtnMissed: { backgroundColor: colors.danger },
});
