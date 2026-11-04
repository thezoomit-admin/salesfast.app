import { HugeiconsIcon } from '@hugeicons/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  CallBlockedIcon,
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOutgoingIcon,
} from '@/components/icons/hugeicons';
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
import { timeOf } from '@/features/leads/dayGroups';
import type { CallSyncStatus } from '@/features/call-tracking/syncPreferences';
import {
  lightColors,
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import { formatPhoneDisplay } from '@/utils/phone';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type CallUiKind = 'incoming' | 'outgoing' | 'missed' | 'failed';

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

/** UI-design only — set false / delete when real call data is ready. */
const USE_CALLS_DEMO = true;

const DEMO_CALLS: RecentCall[] = [
  {
    key: 'demo-1',
    phone: '+8801712345678',
    direction: 'MISSED',
    startedAt: new Date(Date.now() - 12 * 60 * 1000),
    durationSec: 0,
    leadId: 101,
    leadName: 'Rahim Electronics',
  },
  {
    key: 'demo-2',
    phone: '+8801811223344',
    direction: 'OUTGOING',
    startedAt: new Date(Date.now() - 45 * 60 * 1000),
    durationSec: 187,
    leadId: 102,
    leadName: 'Nusrat Fashion House',
  },
  {
    key: 'demo-3',
    phone: '+8801919988776',
    direction: 'INCOMING',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    durationSec: 64,
    leadId: 103,
    leadName: 'Karim Trading Co.',
  },
  {
    key: 'demo-4',
    phone: '+8801612340001',
    direction: 'REJECTED',
    startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    durationSec: 0,
    leadId: 104,
    leadName: 'Green Leaf Agro',
  },
  {
    key: 'demo-5',
    phone: '+8801555667788',
    direction: 'OUTGOING',
    startedAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    durationSec: 9,
    leadId: 105,
    leadName: 'Sultana Pharma',
  },
  {
    key: 'demo-6',
    phone: '+8801700112233',
    direction: 'MISSED',
    startedAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
    durationSec: 0,
    leadId: 106,
    leadName: 'Bay View Properties',
  },
  {
    key: 'demo-7',
    phone: '+8801888776655',
    direction: 'INCOMING',
    startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    durationSec: 412,
    leadId: 107,
    leadName: 'Dhaka Soft Solutions',
  },
  {
    key: 'demo-8',
    phone: '+8801300987654',
    direction: 'UNKNOWN',
    startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    durationSec: 22,
    leadId: 108,
    leadName: 'Metro Logistics',
  },
];

const DEMO_RESULT = {
  state: 'ok' as const,
  calls: DEMO_CALLS,
  watchedCount: DEMO_CALLS.length,
};

/** Same Hugeicons + colors as lead details Call History. */
const KIND_ICON: Record<CallUiKind, HugeIconData> = {
  incoming: PhoneIncomingIcon,
  outgoing: PhoneOutgoingIcon,
  missed: PhoneMissedIcon,
  failed: CallBlockedIcon,
};

function callUiKind(direction: CallSyncDirection): CallUiKind {
  if (direction === 'INCOMING') return 'incoming';
  if (direction === 'OUTGOING') return 'outgoing';
  if (direction === 'MISSED') return 'missed';
  return 'failed';
}

function kindColor(kind: CallUiKind, colors: ThemeColors) {
  if (kind === 'incoming') return colors.brand;
  if (kind === 'outgoing') return colors.success;
  if (kind === 'missed') return colors.danger;
  return colors.warning;
}

function formatDuration(sec: number, kind: CallUiKind) {
  if (sec <= 0) return kind === 'missed' || kind === 'failed' ? '0s' : '—';
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

  const setupDone =
    USE_CALLS_DEMO ||
    Boolean(callSync.prefs?.consentedAt && callSync.prefs?.enabled);
  const calls = useRecentCalls(setupDone && !USE_CALLS_DEMO);

  const refreshSync = callSync.refresh;
  const refetchCalls = calls.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshSync();
      if (setupDone && !USE_CALLS_DEMO) void refetchCalls();
    }, [refreshSync, setupDone, refetchCalls])
  );

  const data = USE_CALLS_DEMO
    ? DEMO_RESULT
    : calls.data?.state === 'ok'
      ? calls.data
      : null;

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === 'missed') return data.calls.filter((c) => isMissed(c.direction));
    return data.calls;
  }, [data, filter]);

  // Missed lead calls in the 24h before the call log was last read.
  const loadedAt = USE_CALLS_DEMO ? Date.now() : calls.dataUpdatedAt;
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

  if (!USE_CALLS_DEMO && callSync.loading && !callSync.prefs) {
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

  const showList =
    USE_CALLS_DEMO ||
    (!calls.isLoading &&
      !calls.isError &&
      calls.data?.state !== 'unsupported' &&
      calls.data?.state !== 'no_permission');

  return (
    <View style={styles.safe}>
      {pageHeader}
      {toolbar}

      {!USE_CALLS_DEMO && calls.isLoading ? (
        <CallsSkeleton />
      ) : !USE_CALLS_DEMO && calls.isError ? (
        <ErrorState
          message={getErrorMessage(calls.error)}
          onRetry={() => calls.refetch()}
        />
      ) : !USE_CALLS_DEMO && calls.data?.state === 'unsupported' ? (
        <EmptyState
          title="Call history not available"
          message="Call history is shown in the SalesFast Android app (development or production build). Expo Go and web cannot read it."
        />
      ) : !USE_CALLS_DEMO && calls.data?.state === 'no_permission' ? (
        <View style={styles.flex}>
          <EmptyState
            title="Permission needed"
            message="Allow call log access to see recent calls with your leads."
          />
          <View style={styles.cta}>
            <Button title="Allow access" onPress={grantPermission} />
          </View>
        </View>
      ) : showList ? (
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
            refreshing={!USE_CALLS_DEMO && calls.isRefetching}
            onRefresh={() => {
              if (!USE_CALLS_DEMO) void calls.refetch();
            }}
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
      ) : null}
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
  const kind = callUiKind(call.direction);
  const icon = KIND_ICON[kind];
  const color = kindColor(kind, colors);
  const duration = formatDuration(call.durationSec, kind);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onOpenLead}
      accessibilityRole="button"
      accessibilityLabel={`Open lead ${call.leadName}`}
    >
      <View style={styles.avatar}>
        <HugeiconsIcon icon={icon} size={22} color={color} strokeWidth={1.5} />
      </View>
      <View style={styles.main}>
        <View style={styles.header}>
          <View style={styles.left}>
            <Text style={styles.name} numberOfLines={1}>
              {call.leadName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{duration}</Text>
              <HugeiconsIcon
                icon={icon}
                size={14}
                color={color}
                strokeWidth={1.5}
              />
              <Text style={styles.meta} numberOfLines={1}>
                · {formatPhoneDisplay(call.phone)}
              </Text>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.time}>{timeOf(call.startedAt)}</Text>
            {kind === 'missed' ? (
              <Text style={styles.missed}>Missed</Text>
            ) : null}
            {kind === 'failed' ? (
              <Text style={styles.failed}>Failed</Text>
            ) : null}
          </View>
        </View>
      </View>
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

    list: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexGrow: 1,
    },
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
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    main: { flex: 1, minWidth: 0 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    left: { flex: 1, minWidth: 0, gap: 2 },
    right: { alignItems: 'flex-end', gap: 2 },
    name: { ...typography.body, fontWeight: '600', color: colors.text },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    meta: { ...typography.caption, color: colors.textSecondary },
    time: { ...typography.caption, color: colors.textMuted },
    missed: {
      ...typography.caption,
      color: colors.danger,
      fontWeight: '700',
    },
    failed: {
      ...typography.caption,
      color: colors.warning,
      fontWeight: '700',
    },
  });
}
