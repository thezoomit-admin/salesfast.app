import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { addWeeks } from 'date-fns/addWeeks';
import { differenceInCalendarWeeks } from 'date-fns/differenceInCalendarWeeks';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfWeek } from 'date-fns/startOfWeek';
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  dayDotColor,
  dayKey,
  groupByDay,
  kindTones,
  useMinuteClock,
  type KindTone,
  type FollowUpKind,
} from '@/components/followups/followUpCalendar';
import { followUpMonthKey, followUpMonthQuery } from '@/features/leads/leadsApi';
import type { MyFollowUp } from '@/types/api';
import { radii, useTheme, type ThemeColors } from '@/theme';

/** Swipeable range either side of the current week (~5 years). */
const WEEKS_EACH_SIDE = 260;
const WEEK_PAGES = Array.from({ length: WEEKS_EACH_SIDE * 2 + 1 }, (_, i) => i);

type Styles = ReturnType<typeof createStyles>;

/** Lets the screen header browse weeks without touching the selection. */
export type WeekStripHandle = {
  shiftWeek: (delta: number) => void;
};

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
  ref?: Ref<WeekStripHandle>;
};

const clampPage = (page: number) => Math.min(Math.max(page, 0), WEEK_PAGES.length - 1);

/** Module-level so useQueries memoizes the merged rows between renders. */
function combineItems(results: UseQueryResult<{ items: MyFollowUp[] }>[]) {
  return results.flatMap((r) => r.data?.items ?? []);
}

/** One week per page; swiping and header arrows only browse — tapping a day selects it. */
function WeekStripImpl({ selected, onSelect, ref }: Props) {
  const { colors, resolved } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(resolved === 'dark'), [resolved]);
  const now = useMinuteClock().getTime();
  const [anchor] = useState(() => startOfWeek(new Date()));
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<number>>(null);

  const selectedPage = clampPage(WEEKS_EACH_SIDE + differenceInCalendarWeeks(selected, anchor));
  const shownPage = useRef(selectedPage);
  const swiping = useRef(false);

  const scrollToPage = useCallback((page: number) => {
    swiping.current = false;
    shownPage.current = page;
    listRef.current?.scrollToIndex({ index: page, animated: true });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      shiftWeek(delta) {
        if (listRef.current) scrollToPage(clampPage(shownPage.current + delta));
      },
    }),
    [scrollToPage]
  );

  // Calendar picks bring the selected week back into view.
  useEffect(() => {
    if (!width || shownPage.current === selectedPage) return;
    scrollToPage(selectedPage);
    // Re-run on every new selection, even within the same week.
  }, [scrollToPage, selected, selectedPage, width]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onSwipeStart = () => {
    swiping.current = true;
  };

  // Android also fires this when a quick arrow tap cancels a scroll half way;
  // only a finger swipe may move shownPage, scrollToPage already set the rest.
  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (swiping.current) shownPage.current = Math.round(e.nativeEvent.contentOffset.x / width);
  };

  const renderWeek = useCallback(
    ({ item: page }: { item: number }) => (
      <WeekPage
        start={addWeeks(anchor, page - WEEKS_EACH_SIDE)}
        selected={selected}
        width={width}
        now={now}
        tones={tones}
        dotColors={colors}
        styles={styles}
        onSelect={onSelect}
      />
    ),
    [anchor, colors, now, onSelect, selected, styles, tones, width]
  );

  return (
    <View style={styles.root} onLayout={onLayout}>
      {width > 0 ? (
        <FlatList
          ref={listRef}
          data={WEEK_PAGES}
          keyExtractor={String}
          renderItem={renderWeek}
          extraData={renderWeek}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedPage}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onScrollBeginDrag={onSwipeStart}
          onMomentumScrollEnd={onSwipeEnd}
          initialNumToRender={1}
          windowSize={3}
        />
      ) : null}
    </View>
  );
}

/** One week; loads its own month(s) so swiped-to weeks get dots too. */
const WeekPage = memo(function WeekPage({
  start,
  selected,
  width,
  now,
  tones,
  dotColors,
  styles,
  onSelect,
}: {
  start: Date;
  selected: Date;
  width: number;
  now: number;
  tones: Record<FollowUpKind, KindTone>;
  dotColors: { danger: string; success: string };
  styles: Styles;
  onSelect: (day: Date) => void;
}) {
  const months = [...new Set([followUpMonthKey(start), followUpMonthKey(addDays(start, 6))])];
  const items = useQueries({
    queries: months.map(followUpMonthQuery),
    combine: combineItems,
  });
  const byDay = useMemo(() => groupByDay(items), [items]);

  return (
    <View style={[styles.week, { width }]}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const active = isSameDay(day, selected);
        const today = isToday(day);
        const dotColor = dayDotColor(byDay.get(dayKey(day)), new Date(now), tones, dotColors);
        return (
          <Pressable
            key={dayKey(day)}
            accessibilityRole="button"
            accessibilityLabel={
              format(day, 'EEEE d MMMM') + (dotColor ? ', has follow-ups' : '')
            }
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(day)}
            style={styles.day}
          >
            <Text style={[styles.name, active && styles.nameActive]}>
              {format(day, 'EEE')}
            </Text>
            {/* collapsable: see the note on styles.date. */}
            <View collapsable={false} style={[styles.bar, active && styles.barActive]} />
            <View collapsable={false} style={[styles.date, active && styles.dateActive]}>
              <Text
                style={[
                  styles.dateText,
                  today && !active && styles.dateToday,
                  active && styles.dateTextActive,
                ]}
              >
                {day.getDate()}
              </Text>
              {dotColor ? (
                <View
                  style={[styles.dot, { backgroundColor: active ? '#FFFFFF' : dotColor }]}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

export const WeekStrip = memo(WeekStripImpl);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { minHeight: 82 },
    week: { flexDirection: 'row' },
    day: { flex: 1, alignItems: 'center' },
    name: { fontSize: 15, color: colors.textMuted },
    nameActive: { color: colors.brand, fontWeight: '600' },
    bar: { width: 44, height: 2, borderRadius: 1, marginTop: 6, marginBottom: 10 },
    barActive: { backgroundColor: colors.brand },
    // Without a background Android flattens this view away. Selecting the day
    // then creates it from the last prop change alone (backgroundColor), which
    // drops borderRadius, so it must stay a real view (collapsable={false}).
    date: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateActive: { backgroundColor: colors.brand },
    dateText: { fontSize: 18, color: colors.textMuted },
    dateToday: { color: colors.brand, fontWeight: '700' },
    dateTextActive: { color: colors.white, fontWeight: '600' },
    dot: {
      position: 'absolute',
      bottom: 3,
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
  });
}
