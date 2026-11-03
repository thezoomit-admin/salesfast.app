import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays } from 'date-fns/addDays';
import { format } from 'date-fns/format';
import { getDaysInMonth } from 'date-fns/getDaysInMonth';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfMonth } from 'date-fns/startOfMonth';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  dayKey,
  followUpKind,
  followUpLabel,
  kindTones,
  leadName,
  TASK_ICON_BLUE,
  useMinuteClock,
  type DayFollowUp,
  type FollowUpKind,
} from '@/components/followups/followUpCalendar';
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Notification01Icon,
} from '@/components/icons/hugeicons';
import { HeaderIconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import type { LeadListItem } from '@/types/api';
import { useTheme, type ThemeColors } from '@/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  selected: Date;
  byDay: Map<string, DayFollowUp[]>;
  loading: boolean;
  errorMessage: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (day: Date) => void;
  onShiftMonth: (delta: number) => void;
  onOpenWeek: () => void;
  onAdd: () => void;
  onOpenLead: (lead: LeadListItem) => void;
  onPressInLead: (lead: LeadListItem) => void;
};

function FollowUpMonthViewImpl({
  selected,
  byDay,
  loading,
  errorMessage,
  refreshing,
  onRefresh,
  onSelect,
  onShiftMonth,
  onOpenWeek,
  onAdd,
  onOpenLead,
  onPressInLead,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock().getTime();

  // Leading blanks, then every day of the month; padded to whole weeks.
  const cells = useMemo(() => {
    const first = startOfMonth(selected);
    const out: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let i = 0; i < getDaysInMonth(first); i++) out.push(addDays(first, i));
    while (out.length % 7) out.push(null);
    return out;
  }, [selected]);

  const tasks = byDay.get(dayKey(selected)) ?? [];

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={format(selected, 'd MMM, yy EEEE')}
        showBack={false}
        right={
          <>
            <HeaderIconButton label="Previous month" onPress={() => onShiftMonth(-1)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
            <HeaderIconButton label="Next month" onPress={() => onShiftMonth(1)}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
          </>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={[colors.primary50, colors.surface]}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={styles.calendar}
        >
          <View style={styles.weekRow}>
            {WEEKDAYS.map((name) => (
              <Text key={name} style={styles.weekday}>
                {name}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
              const active = isSameDay(day, selected);
              const today = isToday(day);
              const first = byDay.get(dayKey(day))?.[0];
              const dotColor = first
                ? first.due.getTime() < now
                  ? colors.danger
                  : tones[followUpKind(first.lead)].accent
                : null;
              return (
                <Pressable
                  key={dayKey(day)}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'EEEE d MMMM')}
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(day)}
                  style={styles.cell}
                >
                  <View style={[styles.dayCircle, active && styles.dayCircleActive]}>
                    <Text
                      style={[
                        styles.dayText,
                        today && !active && styles.dayTextToday,
                        active && styles.dayTextActive,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                  {dotColor && !active ? (
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.tasks}>
          <View style={styles.tasksHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open week timeline"
              onPress={onOpenWeek}
              style={({ pressed }) => [styles.tasksTitleBtn, pressed && styles.pressed]}
            >
              <Text style={styles.tasksTitle} numberOfLines={1}>
                {isToday(selected) ? 'Today’s Task' : `${format(selected, 'd MMM')} Task`}
              </Text>
              <HugeiconsIcon icon={ArrowDown01Icon} size={22} color={colors.text} strokeWidth={1.8} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Schedule a follow-up"
              onPress={onAdd}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            >
              <HugeiconsIcon icon={Add01Icon} size={22} color={colors.white} strokeWidth={2} />
            </Pressable>
          </View>

          {tasks.length > 0 ? (
            tasks.map(({ lead, due }) => {
              const overdue = due.getTime() < now;
              return (
                <Pressable
                  key={lead.id}
                  onPress={() => onOpenLead(lead)}
                  onPressIn={() => onPressInLead(lead)}
                  style={({ pressed }) => [styles.task, pressed && styles.pressed]}
                >
                  <View style={styles.taskIcon}>
                    <TaskIcon kind={followUpKind(lead)} styles={styles} />
                  </View>
                  <View style={styles.taskBody}>
                    <Text style={styles.taskKind} numberOfLines={1}>
                      {followUpLabel(lead)}
                    </Text>
                    <Text style={styles.taskTitle} numberOfLines={2}>
                      {leadName(lead)}
                    </Text>
                    <Text style={styles.taskTime}>
                      {format(due, 'h:mm a')}
                      {overdue ? <Text style={styles.overdue}>  · Overdue</Text> : null}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : loading ? (
            <ActivityIndicator style={styles.state} color={colors.textMuted} />
          ) : (
            <Text style={styles.stateText}>
              {errorMessage ?? 'No follow-ups on this day.'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TaskIcon({
  kind,
  styles,
}: {
  kind: FollowUpKind;
  styles: ReturnType<typeof createStyles>;
}) {
  if (kind === 'todo') return <View style={styles.ring} />;
  return (
    <HugeiconsIcon
      icon={kind === 'event' ? Calendar03Icon : Notification01Icon}
      size={24}
      color={TASK_ICON_BLUE}
      strokeWidth={1.5}
    />
  );
}

export const FollowUpMonthView = memo(FollowUpMonthViewImpl);

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { paddingBottom: 24 },
    pressed: { opacity: 0.6 },
    calendar: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 15,
      color: colors.textSecondary,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayCircleActive: { backgroundColor: ink },
    dayText: { fontSize: 17, color: ink },
    dayTextToday: { color: colors.brand, fontWeight: '700' },
    dayTextActive: { color: isDark ? '#111111' : '#FFFFFF', fontWeight: '500' },
    dot: {
      position: 'absolute',
      bottom: 4,
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    tasks: { paddingHorizontal: 20, paddingTop: 12 },
    tasksHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tasksTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    tasksTitle: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: ink,
      flexShrink: 1,
    },
    addBtn: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    task: {
      flexDirection: 'row',
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    taskIcon: { width: 44, paddingTop: 24 },
    ring: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.6,
      borderColor: TASK_ICON_BLUE,
    },
    taskBody: { flex: 1, minWidth: 0 },
    taskKind: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
    taskTitle: { fontSize: 17, lineHeight: 23, fontWeight: '600', color: ink },
    taskTime: { fontSize: 14, color: colors.textSecondary, marginTop: 10 },
    overdue: { color: colors.danger, fontWeight: '600' },
    state: { paddingVertical: 32 },
    stateText: {
      paddingVertical: 32,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
