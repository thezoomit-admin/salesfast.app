import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { heroBase } from '@/components/home/HomeHero';
import { CallIcon, Search02Icon } from '@/components/icons/hugeicons';
import { type LeadTabItem, LeadTabs } from '@/components/leads/LeadTabs';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { FilterChip } from '@/components/ui/FilterChip';
import { FilterSection, FilterSheet } from '@/components/ui/FilterSheet';
import { Screen } from '@/components/ui/Screen';
import { CallsSkeleton } from '@/components/ui/skeletons';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import {
  CALL_KIND,
  CallCard,
  type CallUiKind,
  callUiKind,
} from '@/features/call-tracking/CallCard';
import { runCallSync } from '@/features/call-tracking/runCallSync';
import type { CallSyncStatus } from '@/features/call-tracking/syncPreferences';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import {
  RECENT_CALLS_KEY,
  requestCallLogPermission,
  useRecentCalls,
  type RecentCall,
} from '@/features/call-tracking/useRecentCalls';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { groupByDay } from '@/features/leads/dayGroups';
import {
  type InboxPalette,
  inboxPalette,
  type InboxTone,
} from '@/features/notifications/inboxPalette';
import {
  CALLS_SCENE,
  NotificationsHero,
} from '@/features/notifications/NotificationsHero';
import { useDebounced } from '@/lib/useDebounced';
import { spacing, useTheme } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type CallTab = 'all' | CallUiKind;
type DateFilter = 'all' | 'today' | 'yesterday' | '7d';

const SYNC_STRIP: Record<
  CallSyncStatus,
  { icon: IoniconName; title: string; tone: InboxTone; action: string }
> = {
  configured: {
    icon: 'checkmark-circle',
    title: 'Call sync active',
    tone: 'green',
    action: 'Manage',
  },
  paused: {
    icon: 'pause-circle',
    title: 'Call sync paused',
    tone: 'amber',
    action: 'Resume',
  },
  not_configured: {
    icon: 'sync',
    title: 'Call sync not set up',
    tone: 'amber',
    action: 'Set up',
  },
  needs_dev_build: {
    icon: 'phone-portrait',
    title: 'Needs Android build',
    tone: 'amber',
    action: 'Details',
  },
  unavailable_web: {
    icon: 'desktop',
    title: 'Android app only',
    tone: 'blue',
    action: 'Details',
  },
};

const TABS: { key: CallTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'incoming', label: CALL_KIND.incoming.label },
  { key: 'outgoing', label: CALL_KIND.outgoing.label },
  { key: 'missed', label: CALL_KIND.missed.label },
  { key: 'failed', label: CALL_KIND.failed.label },
];

/** The device log is read back 10 days, so "All" means those 10 days. */
const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'Last 10 days' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function matchesDateFilter(startedAt: Date, filter: DateFilter, now: Date) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const start = dayStart.getTime();
  const t = startedAt.getTime();
  if (filter === 'today') return t >= start;
  if (filter === 'yesterday') return t >= start - DAY_MS && t < start;
  if (filter === '7d') return t >= start - 6 * DAY_MS;
  return t >= start - 9 * DAY_MS;
}

function matchesSearch(call: RecentCall, keyword: string) {
  if (!keyword) return true;
  if (call.leadName.toLowerCase().includes(keyword.toLowerCase())) return true;
  const digits = keyword.replace(/\D/g, '');
  return digits.length > 0 && call.phone.replace(/\D/g, '').includes(digits);
}

function emptyTitle(tab: CallTab) {
  return tab === 'all'
    ? 'No lead calls yet'
    : `No ${CALL_KIND[tab].label.toLowerCase()} calls`;
}

function CallsScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = inboxPalette(isDark);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const callSync = useCallSyncStatus();

  const [tab, setTab] = useState<CallTab>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [draftDate, setDraftDate] = useState<DateFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const keyword = useDebounced(search.trim());

  const setupDone = Boolean(
    callSync.prefs?.consentedAt && callSync.prefs?.enabled
  );
  const calls = useRecentCalls(setupDone);

  const refreshSync = callSync.refresh;
  const refetchCalls = calls.refetch;
  useFocusEffect(
    useCallback(() => {
      void refreshSync();
      if (setupDone) void refetchCalls();
    }, [refreshSync, setupDone, refetchCalls])
  );

  // The hero is dark enough to need light icons in both themes.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  // Shares the Home dashboard cache, so this adds no extra request.
  const { data: dashboard } = useQuery(dashboardQuery);
  const summary = dashboard
    ? `${dashboard.kpis.todayFollowUps} due · ${dashboard.kpis.overdueFollowUps} overdue`
    : null;

  const data = calls.data?.state === 'ok' ? calls.data : null;

  const shownCalls = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return data.calls.filter(
      (c) =>
        matchesDateFilter(c.startedAt, dateFilter, now) &&
        matchesSearch(c, keyword)
    );
  }, [data, dateFilter, keyword]);

  const tabItems = useMemo(() => {
    const counts: Record<CallTab, number> = {
      all: shownCalls.length,
      incoming: 0,
      outgoing: 0,
      missed: 0,
      failed: 0,
    };
    for (const call of shownCalls) counts[callUiKind(call.direction)] += 1;
    return TABS.map(
      (t): LeadTabItem<CallTab> => ({ ...t, count: counts[t.key] })
    );
  }, [shownCalls]);

  const sections = useMemo(() => {
    const list =
      tab === 'all'
        ? shownCalls
        : shownCalls.filter((c) => callUiKind(c.direction) === tab);
    return groupByDay(list, (c) => c.startedAt).map((g) => ({
      key: g.key,
      title: g.label,
      data: g.items,
    }));
  }, [shownCalls, tab]);

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

  const openSetup = () => router.push('/call-sync/setup');
  const openLead = useCallback(
    (call: RecentCall) => router.push(`/leads/${call.leadId}`),
    [router]
  );

  const toggleSearch = () => {
    if (searchOpen) {
      setSearch('');
      searchRef.current?.blur();
    } else {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    setSearchOpen(!searchOpen);
  };

  const openFilter = () => {
    setDraftDate(dateFilter);
    setFilterOpen(true);
  };

  const strip = SYNC_STRIP[callSync.status];
  const stripTint = palette.tones[strip.tone];
  const stripBody =
    syncMessage ??
    (callSync.status === 'not_configured'
      ? 'Match phone calls with CRM leads. Only lead calls are saved.'
      : callSync.message);

  const syncStrip = (
    <View style={styles.syncCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${strip.title}. ${strip.action}`}
        onPress={openSetup}
        style={({ pressed }) => [styles.syncInfo, pressed && styles.pressed]}
      >
        <View style={[styles.syncIcon, { backgroundColor: stripTint.bg }]}>
          <Ionicons name={strip.icon} size={22} color={stripTint.fg} />
        </View>
        <View style={styles.syncCopy}>
          <Text style={styles.syncTitle} numberOfLines={1}>
            {strip.title}
          </Text>
          {stripBody ? (
            <Text style={styles.syncBody} numberOfLines={2}>
              {stripBody}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {callSync.status === 'configured' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sync now"
          accessibilityState={{ busy: syncing, disabled: syncing }}
          disabled={syncing}
          onPress={syncNow}
          style={({ pressed }) => [styles.syncBtn, pressed && styles.pressed]}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={palette.onAccent} />
          ) : (
            <>
              <Ionicons name="sync" size={14} color={palette.onAccent} />
              <Text style={styles.syncBtnText}>Sync</Text>
            </>
          )}
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={openSetup}
          hitSlop={6}
          style={({ pressed }) => [styles.syncLink, pressed && styles.pressed]}
        >
          <Text style={[styles.syncLinkText, { color: palette.accent }]}>
            {strip.action}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={palette.accent} />
        </Pressable>
      )}
    </View>
  );

  const narrowed = Boolean(keyword) || dateFilter !== 'all';
  const listEmpty = narrowed ? (
    <TintedEmpty
      title="No matching calls"
      message="Try another name or number, or clear the search and date filter."
      icon={Search02Icon}
      palette={palette}
    />
  ) : (
    <TintedEmpty
      title={emptyTitle(tab)}
      message={`Watching ${data?.watchedCount ?? 0} lead numbers. Calls with them show up here.`}
      icon={tab === 'all' ? CallIcon : CALL_KIND[tab].icon}
      palette={palette}
      tone={tab === 'all' ? 'blue' : CALL_KIND[tab].tone}
    />
  );

  let body;
  if (callSync.loading && !callSync.prefs) {
    body = <CallsSkeleton />;
  } else if (!setupDone) {
    body = (
      <TintedEmpty
        title="Set up call sync"
        message="Match your phone calls with CRM leads. Only calls with your leads are saved to the CRM."
        icon={CallIcon}
        palette={palette}
        actionLabel="Start setup"
        onAction={openSetup}
      />
    );
  } else if (calls.isLoading) {
    body = <CallsSkeleton />;
  } else if (calls.isError) {
    body = (
      <ErrorState
        message={getErrorMessage(calls.error)}
        onRetry={() => calls.refetch()}
      />
    );
  } else if (calls.data?.state === 'unsupported') {
    body = (
      <TintedEmpty
        title="Call history not available"
        message="Call history is shown in the SalesFast Android app (development or production build). Expo Go and web cannot read it."
        icon={CallIcon}
        palette={palette}
        actionLabel="Open setup"
        onAction={openSetup}
      />
    );
  } else if (calls.data?.state === 'no_permission') {
    body = (
      <TintedEmpty
        title="Permission needed"
        message="Allow call log access to see recent calls with your leads."
        icon={CallIcon}
        palette={palette}
        actionLabel="Allow access"
        onAction={grantPermission}
      />
    );
  } else {
    body = (
      <>
        <View style={styles.tabs}>
          <LeadTabs
            tabs={tabItems}
            active={tab}
            onChange={setTab}
            countLabel="calls"
          />
        </View>
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.key}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            sections.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <AppRefreshControl
              refreshing={calls.isRefetching}
              onRefresh={() => {
                void calls.refetch();
              }}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={syncStrip}
          ListEmptyComponent={listEmpty}
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayLabel}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <CallCard call={item} onPress={openLead} />
          )}
          ItemSeparatorComponent={CardGap}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      </>
    );
  }

  return (
    <Screen
      header={
        <NotificationsHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
          searchOpen={searchOpen}
          search={search}
          searchRef={searchRef}
          onSearchChange={setSearch}
          onToggleSearch={toggleSearch}
          onOpenFilter={openFilter}
          filterCount={dateFilter === 'all' ? 0 : 1}
          title="Calls"
          tagline={'Every call with your\nleads, in one place'}
          searchPlaceholder="Search name or phone"
          itemsLabel="calls"
          scene={CALLS_SCENE}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      {body}

      <FilterSheet
        open={filterOpen}
        title="Filter calls"
        clearDisabled={draftDate === 'all'}
        onClear={() => setDraftDate('all')}
        onApply={() => setDateFilter(draftDate)}
        onClose={() => setFilterOpen(false)}
      >
        <FilterSection title="Date">
          {DATE_FILTERS.map((opt) => (
            <FilterChip
              key={opt.key}
              label={opt.label}
              active={draftDate === opt.key}
              onPress={() => setDraftDate(opt.key)}
            />
          ))}
        </FilterSection>
      </FilterSheet>
    </Screen>
  );
}

export default memo(CallsScreen);

function CardGap() {
  return <View style={gapStyle} />;
}
const gapStyle = { height: 5 };

/** Empty state with an icon well tinted like the cards (the inbox's look). */
function TintedEmpty({
  title,
  message,
  icon,
  palette,
  tone = 'blue',
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  icon: HugeIconData;
  palette: InboxPalette;
  tone?: InboxTone;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const tint = palette.tones[tone];
  return (
    <EmptyState
      title={title}
      message={message}
      iconBackgroundColor={tint.bg}
      iconElement={
        <HugeiconsIcon icon={icon} size={28} color={tint.fg} strokeWidth={1.5} />
      }
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its content,
      // or the list has nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
      backgroundColor: palette.sheet,
    },
    tabs: {
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    list: { flex: 1 },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    listEmpty: { flexGrow: 1 },
    pressed: { opacity: 0.7 },

    dayLabel: {
      paddingHorizontal: 4,
      paddingTop: 12,
      paddingBottom: 6,
      fontSize: 11.5,
      lineHeight: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
      color: palette.inkSoft,
    },

    syncCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 53,
      paddingVertical: 7,
      paddingLeft: 12,
      paddingRight: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
      boxShadow: '0 2px 6px rgba(40, 60, 140, 0.05)',
    },
    syncInfo: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
    },
    syncIcon: {
      width: 41,
      height: 41,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    syncCopy: { flex: 1, minWidth: 0, gap: 2 },
    syncTitle: {
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '700',
      color: palette.ink,
    },
    syncBody: {
      fontSize: 11,
      lineHeight: 15,
      color: palette.inkSoft,
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      height: 31,
      minWidth: 72,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: palette.accent,
    },
    syncBtnText: {
      fontSize: 12.5,
      lineHeight: 16,
      fontWeight: '700',
      color: palette.onAccent,
    },
    syncLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    syncLinkText: {
      fontSize: 12.5,
      lineHeight: 16,
      fontWeight: '700',
    },
  });
}
