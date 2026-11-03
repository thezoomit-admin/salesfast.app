import { addDays } from 'date-fns/addDays';
import { addWeeks } from 'date-fns/addWeeks';
import { differenceInCalendarWeeks } from 'date-fns/differenceInCalendarWeeks';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfWeek } from 'date-fns/startOfWeek';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { dayKey } from '@/components/followups/followUpCalendar';
import { useTheme, type ThemeColors } from '@/theme';

/** Swipeable range either side of the current week (~5 years). */
const WEEKS_EACH_SIDE = 260;
const WEEK_PAGES = Array.from({ length: WEEKS_EACH_SIDE * 2 + 1 }, (_, i) => i);

type Props = {
  selected: Date;
  onSelect: (day: Date) => void;
};

/** One week per page; swiping moves the selection by whole weeks. */
function WeekStripImpl({ selected, onSelect }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [anchor] = useState(() => startOfWeek(new Date()));
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<number>>(null);

  const selectedPage = Math.min(
    Math.max(WEEKS_EACH_SIDE + differenceInCalendarWeeks(selected, anchor), 0),
    WEEK_PAGES.length - 1
  );
  const shownPage = useRef(selectedPage);

  // Header arrows / calendar picks move the strip to the selected week.
  useEffect(() => {
    if (!width || shownPage.current === selectedPage) return;
    shownPage.current = selectedPage;
    listRef.current?.scrollToIndex({ index: selectedPage, animated: true });
  }, [selectedPage, width]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page === shownPage.current) return;
    shownPage.current = page;
    onSelect(addWeeks(selected, page - selectedPage));
  };

  const renderWeek = useCallback(
    ({ item: page }: { item: number }) => {
      const start = addWeeks(anchor, page - WEEKS_EACH_SIDE);
      return (
        <View style={[styles.week, { width }]}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(start, i);
            const active = isSameDay(day, selected);
            const today = isToday(day);
            return (
              <Pressable
                key={dayKey(day)}
                accessibilityRole="button"
                accessibilityLabel={format(day, 'EEEE d MMMM')}
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(day)}
                style={styles.day}
              >
                <Text style={[styles.name, active && styles.nameActive]}>
                  {format(day, 'EEE')}
                </Text>
                <View style={[styles.bar, active && styles.barActive]} />
                <View style={[styles.date, active && styles.dateActive]}>
                  <Text
                    style={[
                      styles.dateText,
                      today && !active && styles.dateToday,
                      active && styles.dateTextActive,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      );
    },
    [anchor, onSelect, selected, styles, width]
  );

  return (
    <View style={styles.root} onLayout={onLayout}>
      {width > 0 ? (
        <FlatList
          ref={listRef}
          data={WEEK_PAGES}
          keyExtractor={String}
          renderItem={renderWeek}
          extraData={selected}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={selectedPage}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={onSwipeEnd}
          initialNumToRender={1}
          windowSize={3}
        />
      ) : null}
    </View>
  );
}

export const WeekStrip = memo(WeekStripImpl);

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    root: { minHeight: 82 },
    week: { flexDirection: 'row' },
    day: { flex: 1, alignItems: 'center' },
    name: { fontSize: 15, color: colors.textMuted },
    nameActive: { color: ink, fontWeight: '600' },
    bar: { width: 44, height: 2, borderRadius: 1, marginTop: 6, marginBottom: 10 },
    barActive: { backgroundColor: ink },
    date: {
      width: 44,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateActive: { backgroundColor: colors.brand },
    dateText: { fontSize: 18, color: colors.textMuted },
    dateToday: { color: colors.brand, fontWeight: '700' },
    dateTextActive: { color: colors.white, fontWeight: '600' },
  });
}
