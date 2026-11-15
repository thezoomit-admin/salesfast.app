import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  type TextInputInstance,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { heroBase } from '@/components/home/HomeHero';
import {
  Clock01Icon,
  Search02Icon,
  Tick02Icon,
} from '@/components/icons/hugeicons';
import { type LeadTabItem, LeadTabs } from '@/components/leads/LeadTabs';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { FilterChip } from '@/components/ui/FilterChip';
import { FilterSection, FilterSheet } from '@/components/ui/FilterSheet';
import { Screen } from '@/components/ui/Screen';
import { ActivitiesSkeleton } from '@/components/ui/skeletons';
import { EmptyState, QueryPlaceholder } from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
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
import { TaskRow } from '@/features/tasks/TaskRow';
import {
  isDueToday,
  isOpenStatus,
  isTaskOverdue,
  isTodayWork,
  leadTitleOf,
  MY_TASKS_KEY,
  myTasksQuery,
  updateTaskStatus,
  type LeadTask,
  type TasksPage,
} from '@/features/tasks/tasksApi';
import { useDebounced } from '@/lib/useDebounced';
import { spacing, useTheme } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type TaskTab = 'today' | 'open' | 'done';
type DueFilter = 'all' | 'overdue' | 'today' | 'none';

type Section = { key: string; title: string; data: LeadTask[] };

const DUE_FILTERS: { key: DueFilter; label: string }[] = [
  { key: 'all', label: 'Any due date' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Due today' },
  { key: 'none', label: 'No due date' },
];

function CardGap() {
  return <View style={gapStyle} />;
}
const gapStyle = { height: 5 };

function taskDate(task: LeadTask) {
  if (task.status === 'DONE') return task.completedAt ?? task.dueDate;
  return task.dueDate ?? task.createdAt;
}

function matchesSearch(task: LeadTask, keyword: string) {
  if (!keyword) return true;
  const hay = [
    task.title,
    task.description,
    leadTitleOf(task),
    task.lead?.organization?.name,
    task.lead?.leadStatus?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(keyword);
}

function matchesDue(task: LeadTask, filter: DueFilter) {
  if (filter === 'all') return true;
  if (filter === 'none') return !task.dueDate;
  if (filter === 'today') {
    return isOpenStatus(task.status) && isDueToday(task.dueDate);
  }
  return isTaskOverdue(task.dueDate, task.status);
}

function emptyCopy(tab: TaskTab, narrowed: boolean) {
  if (narrowed) {
    return {
      title: 'No matching tasks',
      message: 'Try another search or clear the filters.',
      icon: Search02Icon,
      tone: 'blue' as InboxTone,
    };
  }
  if (tab === 'today') {
    return {
      title: 'Nothing due today',
      message: "Overdue and today's tasks will show up here.",
      icon: Clock01Icon,
      tone: 'sky' as InboxTone,
    };
  }
  if (tab === 'open') {
    return {
      title: 'No open tasks',
      message: 'Assigned work that is still open appears here.',
      icon: Tick02Icon,
      tone: 'amber' as InboxTone,
    };
  }
  return {
    title: 'No completed tasks',
    message: 'Finished tasks will land in this list.',
    icon: Tick02Icon,
    tone: 'green' as InboxTone,
  };
}

function TasksScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = inboxPalette(isDark);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const searchRef = useRef<TextInputInstance>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const keyword = useDebounced(search.trim().toLowerCase());
  const [tab, setTab] = useState<TaskTab>('today');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDue, setDraftDue] = useState<DueFilter>('all');
  const [completingId, setCompletingId] = useState<number | null>(null);

  const dashboard = useQuery(dashboardQuery);
  const query = useQuery(myTasksQuery);
  const { refetch } = query;

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  useFocusEffect(
    useCallback(() => {
      void refetch({ cancelRefetch: false });
    }, [refetch])
  );

  const items = query.data?.items ?? [];
  const narrowed = Boolean(keyword) || dueFilter !== 'all';

  const counts = useMemo(() => {
    let today = 0;
    let open = 0;
    let done = 0;
    for (const t of items) {
      if (isTodayWork(t)) today += 1;
      if (isOpenStatus(t.status)) open += 1;
      if (t.status === 'DONE') done += 1;
    }
    return { today, open, done };
  }, [items]);

  const tabs = useMemo<LeadTabItem<TaskTab>[]>(
    () => [
      { key: 'today', label: 'Today', count: counts.today || undefined },
      { key: 'open', label: 'Open', count: counts.open || undefined },
      { key: 'done', label: 'Done', count: counts.done || undefined },
    ],
    [counts]
  );

  const filtered = useMemo(() => {
    const byTab =
      tab === 'today'
        ? items.filter(isTodayWork)
        : tab === 'open'
          ? items.filter((t) => isOpenStatus(t.status))
          : items.filter((t) => t.status === 'DONE');
    return byTab
      .filter((t) => matchesSearch(t, keyword))
      .filter((t) => matchesDue(t, dueFilter));
  }, [items, tab, keyword, dueFilter]);

  const sections = useMemo<Section[]>(() => {
    // Overdue first, then day groups, then no-date.
    const overdue: LeadTask[] = [];
    const dated: LeadTask[] = [];
    const undated: LeadTask[] = [];
    for (const task of filtered) {
      if (tab !== 'done' && isTaskOverdue(task.dueDate, task.status)) {
        overdue.push(task);
      } else if (!taskDate(task)) {
        undated.push(task);
      } else {
        dated.push(task);
      }
    }
    const out: Section[] = [];
    if (overdue.length) {
      out.push({ key: 'overdue', title: 'Overdue', data: overdue });
    }
    for (const day of groupByDay(dated, taskDate)) {
      out.push({ key: day.key, title: day.label, data: day.items });
    }
    if (undated.length) {
      out.push({ key: 'undated', title: 'No due date', data: undated });
    }
    return out;
  }, [filtered, tab]);

  const complete = useMutation({
    mutationFn: (task: LeadTask) => updateTaskStatus(task.id, 'DONE'),
    onMutate: async (task) => {
      setCompletingId(task.id);
      await queryClient.cancelQueries({ queryKey: MY_TASKS_KEY });
      const previous = queryClient.getQueryData<TasksPage>(MY_TASKS_KEY);
      queryClient.setQueryData<TasksPage>(MY_TASKS_KEY, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === task.id
              ? {
                  ...item,
                  status: 'DONE',
                  completedAt: new Date().toISOString(),
                }
              : item
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _task, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(MY_TASKS_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      setCompletingId(null);
      void queryClient.invalidateQueries({ queryKey: MY_TASKS_KEY });
    },
  });

  const onOpen = useCallback(
    (leadId: number) => router.push(`/leads/${leadId}`),
    [router]
  );

  const onComplete = useCallback(
    (task: LeadTask) => complete.mutate(task),
    [complete]
  );

  const onBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/(tabs)');
  }, [navigation, router]);

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
    setDraftDue(dueFilter);
    setFilterOpen(true);
  };

  const summary =
    counts.today > 0 || counts.open > 0
      ? `${counts.today} today · ${counts.open} open`
      : dashboard.data
        ? 'No open tasks'
        : null;

  const empty = emptyCopy(tab, narrowed);

  return (
    <Screen
      header={
        <NotificationsHero
          name={user?.name?.trim() || 'Agent'}
          photo={user?.profilePhoto}
          summary={summary}
          onBack={onBack}
          searchOpen={searchOpen}
          search={search}
          searchRef={searchRef}
          onSearchChange={setSearch}
          onToggleSearch={toggleSearch}
          onOpenFilter={openFilter}
          filterCount={dueFilter === 'all' ? 0 : 1}
          title="My Tasks"
          tagline={"What you need to do\ntoday — and next"}
          searchPlaceholder="Search tasks or leads"
          itemsLabel="tasks"
          scene={CALLS_SCENE}
        />
      }
      style={{ backgroundColor: heroBase(isDark) }}
      contentStyle={styles.sheet}
    >
      <View style={styles.tabs}>
        <LeadTabs
          tabs={tabs}
          active={tab}
          onChange={setTab}
          countLabel="tasks"
        />
      </View>

      {!query.data ? (
        <QueryPlaceholder
          query={query}
          errorMessage={getErrorMessage(query.error)}
          skeleton={<ActivitiesSkeleton />}
        />
      ) : (
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => String(item.id)}
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
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <TintedEmpty
              title={empty.title}
              message={empty.message}
              icon={empty.icon}
              palette={palette}
              tone={empty.tone}
              actionLabel={narrowed ? 'Clear filters' : undefined}
              onAction={
                narrowed
                  ? () => {
                      setSearch('');
                      setDueFilter('all');
                    }
                  : undefined
              }
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayLabel}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onOpen={onOpen}
              onComplete={tab === 'done' ? undefined : onComplete}
              completing={completingId === item.id}
            />
          )}
          ItemSeparatorComponent={CardGap}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      <FilterSheet
        open={filterOpen}
        title="Filter tasks"
        clearDisabled={draftDue === 'all'}
        onClear={() => setDraftDue('all')}
        onApply={() => setDueFilter(draftDue)}
        onClose={() => setFilterOpen(false)}
      >
        <FilterSection title="Due date">
          {DUE_FILTERS.map((opt) => (
            <FilterChip
              key={opt.key}
              label={opt.label}
              active={draftDue === opt.key}
              onPress={() => setDraftDue(opt.key)}
            />
          ))}
        </FilterSection>
      </FilterSheet>
    </Screen>
  );
}

export default memo(TasksScreen);

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
  });
}
