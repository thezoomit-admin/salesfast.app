import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import {
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { CallsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
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
import type { CallSyncStatus } from '@/features/call-tracking/syncPreferences';
import {
  lightColors,
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import { formatDate } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer } from '@/utils/phone';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const SYNC_BANNER: Record<
  CallSyncStatus,
  {
    icon: IoniconName;
    title: string;
    tone: 'ok' | 'warn' | 'muted';
    action: string;
  }
> = {
  configured: {
    icon: 'checkmark-circle',
    title: 'Call sync active',
    tone: 'ok',
    action: 'Manage',
  },
  paused: {
    icon: 'pause-circle',
    title: 'Call sync paused',
    tone: 'warn',
    action: 'Resume',
  },
  not_configured: {
    icon: 'sync-outline',
    title: 'Call sync not set up',
    tone: 'warn',
    action: 'Set up',
  },
  needs_dev_build: {
    icon: 'phone-portrait-outline',
    title: 'Needs Android build',
    tone: 'warn',
    action: 'Details',
  },
  unavailable_web: {
    icon: 'desktop-outline',
    title: 'Android app only',
    tone: 'muted',
    action: 'Details',
  },
};

type FilterKey = 'leads' | 'missed';

const FILTERS: readonly (readonly [FilterKey, string])[] = [
  ['leads', 'Lead calls'],
  ['missed', 'Missed'],
];

function directionIcons(
  colors: ThemeColors
): Record<
  CallSyncDirection,
  { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }
> {
  return {
    INCOMING: { name: 'arrow-down', color: colors.success },
    OUTGOING: { name: 'arrow-up', color: colors.brand },
    MISSED: { name: 'times', color: colors.danger },
    REJECTED: { name: 'ban', color: colors.danger },
    UNKNOWN: { name: 'phone', color: colors.textMuted },
  };
}

function formatDuration(sec: number) {
  if (sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function CallsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
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
    if (filter === 'missed') return data.calls.filter((c) => isMissed(c.direction));
    return data.calls;
  }, [data, filter]);

  // Missed lead calls in the 24h before the call log was last read.
  const loadedAt = calls.dataUpdatedAt;
  const missedCount = useMemo(
    () =>
      data?.calls.filter(
        (c) =>
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
  const banner = SYNC_BANNER[callSync.status];
  const bannerBody = syncMessage ?? (
    syncOk
      ? callSync.message
      : callSync.status === 'not_configured'
        ? 'Match phone calls with CRM leads. Only lead calls are saved.'
        : callSync.message
  );

  const pageHeader = (
    <ScreenHeader
      title="Calls"
      showBack={false}
      right={
        <HeaderIconButton
          label="Call sync settings"
          onPress={() => router.push('/call-sync/setup')}
        >
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </HeaderIconButton>
      }
    />
  );

  const toolbar = (
    <View style={styles.toolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.action}`}
        onPress={() => router.push('/call-sync/setup')}
        style={({ pressed }) => [
          styles.syncCard,
          styles[`syncCard_${banner.tone}`],
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.syncIcon, styles[`syncIcon_${banner.tone}`]]}>
          <Ionicons
            name={banner.icon}
            size={22}
            color={
              banner.tone === 'ok'
                ? colors.success
                : banner.tone === 'warn'
                  ? colors.warning
                  : colors.textMuted
            }
          />
        </View>
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle}>{banner.title}</Text>
          <Text style={styles.syncBody} numberOfLines={2}>
            {bannerBody}
          </Text>
        </View>
        <View style={styles.syncAction}>
          <Text
            style={[
              styles.syncActionText,
              banner.tone === 'ok' && styles.syncActionTextOk,
            ]}
          >
            {banner.action}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={banner.tone === 'ok' ? colors.success : colors.brand}
          />
        </View>
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
      <View style={styles.safe}>
        {pageHeader}
        <CallsSkeleton />
      </View>
    );
  }

  if (!setupDone) {
    return (
      <View style={styles.safe}>
        {pageHeader}
        {toolbar}
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
    <View style={styles.safe}>
      {pageHeader}
      {toolbar}

      {calls.isLoading ? (
        <CallsSkeleton />
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
                  filter === 'missed' ? 'No missed lead calls' : 'No lead calls yet'
                }
                message={`Watching ${data?.watchedCount ?? 0} lead numbers.`}
              />
            }
            renderItem={({ item }) => (
              <CallRow
                call={item}
                onOpenLead={() => router.push(`/leads/${item.leadId}`)}
              />
            )}
          />
        </>
      )}
    </View>
  );
}

export default memo(CallsScreen);

function CallRow({
  call,
  onOpenLead,
}: {
  call: RecentCall;
  onOpenLead: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const icon = directionIcons(colors)[call.direction];
  const missed = isMissed(call.direction);
  const duration = formatDuration(call.durationSec);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onOpenLead}
    >
      <View style={[styles.dirIcon, missed && styles.dirIconMissed]}>
        <FontAwesome name={icon.name} size={13} color={icon.color} />
      </View>
      <View style={styles.cardCopy}>
        <Text
          style={[styles.name, missed && styles.nameMissed]}
          numberOfLines={1}
        >
          {call.leadName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatPhoneDisplay(call.phone)} · {formatDate(call.startedAt)}
          {duration ? ` · ${duration}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={() => void openPhoneDialer(call.phone)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Call ${call.leadName}`}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    toolbar: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    cta: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    pressed: { opacity: 0.8 },

    syncCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    syncCard_ok: {
      backgroundColor: colors.successSoft,
      borderColor: colors === lightColors ? '#A6F4C5' : colors.success,
    },
    syncCard_warn: {
      backgroundColor: colors.warningSoft,
      borderColor: colors === lightColors ? '#FEDF89' : colors.warning,
    },
    syncCard_muted: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    syncIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    syncIcon_ok: { backgroundColor: 'rgba(18, 183, 106, 0.15)' },
    syncIcon_warn: { backgroundColor: 'rgba(247, 144, 9, 0.15)' },
    syncIcon_muted: { backgroundColor: colors.surfaceMuted },
    syncCopy: { flex: 1, gap: 3, minWidth: 0 },
    syncTitle: { ...typography.subtitle, color: colors.text, fontSize: 15 },
    syncBody: {
      ...typography.caption,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    syncAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
    },
    syncActionText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.brand,
      fontSize: 13,
    },
    syncActionTextOk: { color: colors.success },

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
}
