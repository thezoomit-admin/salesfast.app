import { HugeiconsIcon } from '@hugeicons/react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import {
  CallBlockedIcon,
  FilterIcon,
  MultiplicationSignIcon,
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOutgoingIcon,
} from '@/components/icons/hugeicons';
import { DayGroupHeader } from '@/components/leads/LeadSectionShell';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import {
  HeaderIconButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { SettingsIconButton } from '@/components/ui/SettingsIconButton';
import { CallsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import type { CallSyncDirection } from '@/features/call-tracking/callSyncApi';
import { runCallSync } from '@/features/call-tracking/runCallSync';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import {
  RECENT_CALLS_KEY,
  requestCallLogPermission,
  useRecentCalls,
  type RecentCall,
} from '@/features/call-tracking/useRecentCalls';
import { groupByDay, timeOf } from '@/features/leads/dayGroups';
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
type CallTab = 'all' | CallUiKind;
type DateFilter = 'all' | 'today' | 'yesterday' | '7d' | '10d';

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

/** Same tabs as lead details Call History. */
const TABS: { key: CallTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'outgoing', label: 'Outgoing' },
  { key: 'missed', label: 'Missed' },
  { key: 'failed', label: 'Failed' },
];

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '10d', label: 'Last 10 days' },
];

/** UI-design only — set false / delete when real call data is ready. */
const USE_CALLS_DEMO = true;

const DEMO_LEADS = [
  { id: 101, name: 'Rahim Electronics', phone: '+8801712345678' },
  { id: 102, name: 'Nusrat Fashion House', phone: '+8801811223344' },
  { id: 103, name: 'Karim Trading Co.', phone: '+8801919988776' },
  { id: 104, name: 'Green Leaf Agro', phone: '+8801612340001' },
  { id: 105, name: 'Sultana Pharma', phone: '+8801555667788' },
  { id: 106, name: 'Bay View Properties', phone: '+8801700112233' },
  { id: 107, name: 'Dhaka Soft Solutions', phone: '+8801888776655' },
  { id: 108, name: 'Metro Logistics', phone: '+8801300987654' },
  { id: 109, name: 'Sunrise Café', phone: '+8801966554433' },
  { id: 110, name: 'Orbit Motors', phone: '+8801522334455' },
] as const;

const DEMO_DIRS: CallSyncDirection[] = [
  'INCOMING',
  'OUTGOING',
  'MISSED',
  'REJECTED',
  'OUTGOING',
  'INCOMING',
  'MISSED',
  'UNKNOWN',
  'OUTGOING',
  'INCOMING',
];

function buildDemoCalls(): RecentCall[] {
  const now = new Date();
  const calls: RecentCall[] = [];
  let n = 0;

  for (let day = 0; day < 10; day += 1) {
    const perDay = 2 + (day % 3);
    for (let i = 0; i < perDay; i += 1) {
      const lead = DEMO_LEADS[(day * 2 + i) % DEMO_LEADS.length]!;
      const direction = DEMO_DIRS[(day + i) % DEMO_DIRS.length]!;
      const startedAt = new Date(now);
      startedAt.setHours(0, 0, 0, 0);
      startedAt.setDate(startedAt.getDate() - day);
      startedAt.setHours(9 + i * 3, 10 + i * 11 + day, 0, 0);

      const missedOrFailed =
        direction === 'MISSED' ||
        direction === 'REJECTED' ||
        direction === 'UNKNOWN';
      calls.push({
        key: `demo-${day}-${i}-${n}`,
        phone: lead.phone,
        direction,
        startedAt,
        durationSec: missedOrFailed ? 0 : 45 + ((day * 17 + i * 23) % 360),
        leadId: lead.id,
        leadName: lead.name,
      });
      n += 1;
    }
  }

  return calls.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

const DEMO_CALLS = buildDemoCalls();

const DEMO_RESULT = {
  state: 'ok' as const,
  calls: DEMO_CALLS,
  watchedCount: DEMO_LEADS.length,
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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function matchesDateFilter(startedAt: Date, filter: DateFilter, now: Date) {
  const dayStart = startOfDay(now).getTime();
  const t = startedAt.getTime();
  if (filter === 'today') return t >= dayStart;
  if (filter === 'yesterday') {
    const yStart = dayStart - 24 * 60 * 60 * 1000;
    return t >= yStart && t < dayStart;
  }
  if (filter === '7d') return t >= dayStart - 6 * 24 * 60 * 60 * 1000;
  if (filter === '10d' || filter === 'all') {
    return t >= dayStart - 9 * 24 * 60 * 60 * 1000;
  }
  return true;
}

function CallsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const callSync = useCallSyncStatus();
  const [tab, setTab] = useState<CallTab>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  /** Session-only — reopens whenever this screen is focused again. */
  const [alertDismissed, setAlertDismissed] = useState(false);

  const setupDone =
    USE_CALLS_DEMO ||
    Boolean(callSync.prefs?.consentedAt && callSync.prefs?.enabled);
  const calls = useRecentCalls(setupDone && !USE_CALLS_DEMO);

  const needsSetup =
    callSync.status === 'not_configured' ||
    callSync.status === 'paused' ||
    callSync.status === 'needs_dev_build';

  const refreshSync = callSync.refresh;
  const refetchCalls = calls.refetch;
  useFocusEffect(
    useCallback(() => {
      setAlertDismissed(false);
      void refreshSync();
      if (setupDone && !USE_CALLS_DEMO) void refetchCalls();
    }, [refreshSync, setupDone, refetchCalls])
  );

  const data = USE_CALLS_DEMO
    ? DEMO_RESULT
    : calls.data?.state === 'ok'
      ? calls.data
      : null;

  const datedCalls = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return data.calls.filter((c) =>
      matchesDateFilter(c.startedAt, dateFilter, now)
    );
  }, [data, dateFilter]);

  const counts = useMemo(() => {
    const c = {
      incoming: 0,
      outgoing: 0,
      missed: 0,
      failed: 0,
      total: datedCalls.length,
    };
    for (const call of datedCalls) c[callUiKind(call.direction)] += 1;
    return c;
  }, [datedCalls]);

  const filtered = useMemo(() => {
    if (tab === 'all') return datedCalls;
    return datedCalls.filter((c) => callUiKind(c.direction) === tab);
  }, [datedCalls, tab]);

  const sections = useMemo(
    () =>
      groupByDay(filtered, (c) => c.startedAt).map((g) => ({
        key: g.key,
        title: g.label,
        data: g.items,
      })),
    [filtered]
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
  const showSetupAlert = needsSetup && !alertDismissed;

  const dateFilterActive = dateFilter !== 'all';

  const pageHeader = (
    <ScreenHeader
      title="Calls"
      showBack={false}
      right={
        <View style={styles.headerActions}>
          <HeaderIconButton
            label="Filter calls"
            onPress={() => setFilterOpen(true)}
          >
            <HugeiconsIcon
              icon={FilterIcon}
              size={22}
              color={dateFilterActive ? colors.brand : colors.text}
              strokeWidth={1.5}
            />
          </HeaderIconButton>
          <SettingsIconButton size={22} color={colors.text} />
        </View>
      }
    />
  );

  const setupAlert = showSetupAlert ? (
    <View style={styles.alertOverlay} pointerEvents="box-none">
      <View
        style={[
          styles.syncCard,
          styles[`syncCard_${banner.tone}`],
          styles.alertCard,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${banner.title}. ${banner.action}`}
          onPress={() => router.push('/call-sync/setup')}
          style={({ pressed }) => [
            styles.alertMain,
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
            <Text style={styles.syncActionText}>{banner.action}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert"
          onPress={() => setAlertDismissed(true)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.alertClose,
            pressed && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={MultiplicationSignIcon}
            size={18}
            color={colors.textMuted}
            strokeWidth={1.5}
          />
        </Pressable>
      </View>
    </View>
  ) : null;

  const configuredToolbar = syncOk ? (
    <View style={styles.toolbar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${banner.title}. ${banner.action}`}
        onPress={() => router.push('/call-sync/setup')}
        style={({ pressed }) => [
          styles.syncCard,
          styles.syncCard_ok,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.syncIcon, styles.syncIcon_ok]}>
          <Ionicons name={banner.icon} size={22} color={colors.success} />
        </View>
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle}>{banner.title}</Text>
          <Text style={styles.syncBody} numberOfLines={2}>
            {bannerBody}
          </Text>
        </View>
        <View style={styles.syncAction}>
          <Text style={[styles.syncActionText, styles.syncActionTextOk]}>
            {banner.action}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.success} />
        </View>
      </Pressable>
      <Button
        title="Sync now"
        variant="secondary"
        loading={syncing}
        onPress={syncNow}
      />
    </View>
  ) : null;

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
        <View style={styles.body}>
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
          {setupAlert}
        </View>
        <CallsFilterSheet
          open={filterOpen}
          value={dateFilter}
          onClose={() => setFilterOpen(false)}
          onChange={setDateFilter}
        />
      </View>
    );
  }

  const showList =
    USE_CALLS_DEMO ||
    (!calls.isLoading &&
      !calls.isError &&
      calls.data?.state !== 'unsupported' &&
      calls.data?.state !== 'no_permission');

  const emptyCopy =
    filtered.length === 0
      ? tab === 'incoming'
        ? 'No incoming calls'
        : tab === 'outgoing'
          ? 'No outgoing calls'
          : tab === 'missed'
            ? 'No missed calls'
            : tab === 'failed'
              ? 'No failed calls'
              : 'No lead calls yet'
      : '';

  return (
    <View style={styles.safe}>
      {pageHeader}
      {configuredToolbar}

      <View style={styles.body}>
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {TABS.map((t) => (
                <FilterChip
                  key={t.key}
                  label={
                    t.key === 'all'
                      ? `${t.label}  ${counts.total}`
                      : `${t.label}  ${counts[t.key]}`
                  }
                  active={tab === t.key}
                  onPress={() => setTab(t.key)}
                />
              ))}
            </ScrollView>

            <SectionList
              sections={sections}
              keyExtractor={(item) => item.key}
              stickySectionHeadersEnabled={false}
              contentContainerStyle={styles.list}
              refreshing={!USE_CALLS_DEMO && calls.isRefetching}
              onRefresh={() => {
                if (!USE_CALLS_DEMO) void calls.refetch();
              }}
              ListEmptyComponent={
                <EmptyState
                  title={emptyCopy || 'No lead calls yet'}
                  message={`Watching ${data?.watchedCount ?? 0} lead numbers.`}
                />
              }
              renderSectionHeader={({ section }) => (
                <DayGroupHeader label={section.title} />
              )}
              renderItem={({ item, index, section }) => {
                const isFirstInGroup = index === 0;
                const isLastInGroup = index === section.data.length - 1;
                return (
                  <CallRow
                    call={item}
                    isFirst={isFirstInGroup}
                    isLast={isLastInGroup}
                    onOpenLead={() => router.push(`/leads/${item.leadId}`)}
                  />
                );
              }}
            />
          </>
        ) : null}

        {setupAlert}
      </View>

      <CallsFilterSheet
        open={filterOpen}
        value={dateFilter}
        onClose={() => setFilterOpen(false)}
        onChange={setDateFilter}
      />
    </View>
  );
}

export default memo(CallsScreen);

function CallsFilterSheet({
  open,
  value,
  onClose,
  onChange,
}: {
  open: boolean;
  value: DateFilter;
  onClose: () => void;
  onChange: (next: DateFilter) => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.filterBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filter"
        />
        <View
          style={[
            styles.filterSheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.filterHandle} />
          <Text style={styles.filterTitle}>Filter by date</Text>
          {DATE_FILTERS.map((opt) => {
            const active = value === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  onChange(opt.key);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.filterRow,
                  active && styles.filterRowActive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterRowLabel,
                    active && styles.filterRowLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {active ? (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={colors.brand}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

function CallRow({
  call,
  isFirst,
  isLast,
  onOpenLead,
}: {
  call: RecentCall;
  isFirst: boolean;
  isLast: boolean;
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
      style={({ pressed }) => [
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        pressed && styles.pressed,
      ]}
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
    safe: { flex: 1, backgroundColor: colors.surface },
    flex: { flex: 1 },
    body: { flex: 1, position: 'relative' },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toolbar: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    alertOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: spacing.md,
      paddingHorizontal: spacing.lg,
      zIndex: 20,
      elevation: 8,
    },
    alertCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    alertMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minWidth: 0,
    },
    alertClose: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
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

    pillRow: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      alignItems: 'center',
    },

    list: {
      paddingLeft: spacing.md,
      paddingRight: spacing.lg,
      paddingBottom: spacing.lg,
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: 10,
      alignItems: 'flex-start',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowFirst: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    avatar: {
      width: 28,
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

    filterBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
      justifyContent: 'flex-end',
    },
    filterSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    filterHandle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    filterTitle: {
      ...typography.subtitle,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    filterRowActive: {
      backgroundColor: colors.primary50,
      marginHorizontal: -spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
      borderBottomWidth: 0,
    },
    filterRowLabel: {
      ...typography.body,
      color: colors.text,
    },
    filterRowLabelActive: {
      color: colors.brand,
      fontWeight: '700',
    },
  });
}
