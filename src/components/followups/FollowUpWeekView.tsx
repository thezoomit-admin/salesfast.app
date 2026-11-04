import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { memo, useMemo, useRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  dayKey,
  kindTones,
  NO_FOLLOW_UPS,
  useMinuteClock,
  type DayFollowUp,
} from '@/components/followups/followUpCalendar';
import { FollowUpEmpty } from '@/components/followups/FollowUpEmpty';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@/components/icons/hugeicons';
import { FollowUpItemCard } from '@/components/followups/FollowUpCard';
import { WeekStrip, type WeekStripHandle } from '@/components/followups/WeekStrip';
import { HeaderIconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import type { MyFollowUp } from '@/types/api';
import { useTheme, type ThemeColors } from '@/theme';

/** The timeline always covers working hours; earlier/later slots appear when used. */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const HOUR_MIN_HEIGHT = 112;
const NOW_DASHES = 80;

type Props = {
  tabs: ReactNode;
  selected: Date;
  byDay: Map<string, DayFollowUp[]>;
  loading: boolean;
  errorMessage: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (day: Date) => void;
  onPickDate: () => void;
  onOpen: (item: MyFollowUp) => void;
  onPressIn: (item: MyFollowUp) => void;
  onMore: (item: MyFollowUp) => void;
  onComplete: (item: MyFollowUp) => void;
};

function hourLabel(hour: number) {
  return { value: hour % 12 === 0 ? 12 : hour % 12, suffix: hour < 12 ? 'AM' : 'PM' };
}

function FollowUpWeekViewImpl({
  tabs,
  selected,
  byDay,
  loading,
  errorMessage,
  refreshing,
  onRefresh,
  onSelect,
  onPickDate,
  onOpen,
  onPressIn,
  onMore,
  onComplete,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock();
  const weekStrip = useRef<WeekStripHandle>(null);

  const items = byDay.get(dayKey(selected)) ?? NO_FOLLOW_UPS;
  const hours = useMemo(() => {
    let first = DAY_START_HOUR;
    let last = DAY_END_HOUR;
    for (const { due } of items) {
      first = Math.min(first, due.getHours());
      last = Math.max(last, due.getHours());
    }
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }, [items]);

  const showNow = isToday(selected);
  const dayEmpty = !loading && items.length === 0;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={format(selected, 'd MMM, yy EEEE')}
        showBack={false}
        onTitlePress={onPickDate}
        right={
          <>
            <HeaderIconButton label="Previous week" onPress={() => weekStrip.current?.shiftWeek(-1)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
            <HeaderIconButton label="Next week" onPress={() => weekStrip.current?.shiftWeek(1)}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
          </>
        }
      />
      {tabs}

      <View style={styles.weekStrip}>
        <WeekStrip ref={weekStrip} selected={selected} onSelect={onSelect} />
      </View>

      <ScrollView
        style={styles.timeline}
        contentContainerStyle={[
          styles.timelineContent,
          dayEmpty && styles.timelineEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && items.length === 0 ? (
          <ActivityIndicator style={styles.loading} color={colors.textMuted} />
        ) : null}
        {errorMessage && items.length === 0 ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}

        {dayEmpty ? (
          <FollowUpEmpty kind="calendar" />
        ) : (
          hours.map((hour) => {
            const label = hourLabel(hour);
            const slot = items.filter(({ due }) => due.getHours() === hour);
            const nowHere = showNow && now.getHours() === hour;
            return (
              <View key={hour} style={styles.hourRow}>
                {nowHere ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.nowLine,
                      { top: `${(now.getMinutes() / 60) * 100}%` },
                    ]}
                  >
                    {Array.from({ length: NOW_DASHES }, (_, i) => (
                      <View key={i} style={styles.nowDash} />
                    ))}
                  </View>
                ) : null}
                <View style={styles.hourLabel}>
                  <Text style={styles.hourValue}>{label.value}</Text>
                  <Text style={styles.hourSuffix}>{label.suffix}</Text>
                </View>
                <View style={styles.slot}>
                  {slot.map(({ item, due }) => (
                    <FollowUpItemCard
                      key={item.id}
                      item={item}
                      due={due}
                      now={now}
                      tones={tones}
                      onOpen={onOpen}
                      onPressIn={onPressIn}
                      onMore={onMore}
                      onComplete={onComplete}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export const FollowUpWeekView = memo(FollowUpWeekViewImpl);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    weekStrip: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    timeline: { flex: 1 },
    timelineContent: { paddingBottom: 24 },
    timelineEmpty: { flexGrow: 1, justifyContent: 'center' },
    loading: { paddingVertical: 16 },
    error: {
      paddingVertical: 16,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textMuted,
    },
    hourRow: {
      flexDirection: 'row',
      minHeight: HOUR_MIN_HEIGHT,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    hourLabel: { width: 64, alignItems: 'center', paddingTop: 16 },
    hourValue: { fontSize: 19, color: colors.textMuted },
    hourSuffix: { fontSize: 13, color: colors.textMuted, marginTop: -2 },
    slot: { flex: 1, gap: 6, paddingVertical: 6, paddingRight: 20 },
    nowLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      gap: 4,
      overflow: 'hidden',
    },
    nowDash: { width: 6, height: 1.5, backgroundColor: colors.brand },
  });
}
