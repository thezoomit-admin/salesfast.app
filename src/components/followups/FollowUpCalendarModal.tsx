import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { format } from 'date-fns/format';
import { getDaysInMonth } from 'date-fns/getDaysInMonth';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfMonth } from 'date-fns/startOfMonth';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  dayKey,
  followUpKind,
  groupByDay,
  kindTones,
  useMinuteClock,
} from '@/components/followups/followUpCalendar';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@/components/icons/hugeicons';
import { followUpMonthKey, followUpMonthQuery } from '@/features/leads/leadsApi';
import { radii, spacing, useTheme, type ThemeColors } from '@/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Props = {
  open: boolean;
  selected: Date;
  onSelect: (day: Date) => void;
  onClose: () => void;
};

/** Month calendar in a centered modal; dots mark days with follow-ups. */
export function FollowUpCalendarModal({ open, selected, onSelect, onClose }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock().getTime();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));

  // Every open starts on the selected day's month.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setViewMonth(startOfMonth(selected));
  }

  const month = useQuery({
    ...followUpMonthQuery(followUpMonthKey(viewMonth)),
    enabled: open,
  });
  const byDay = useMemo(() => groupByDay(month.data?.items ?? []), [month.data]);

  // Leading blanks, then every day of the month; padded to whole weeks.
  const cells = useMemo(() => {
    const out: (Date | null)[] = Array.from({ length: viewMonth.getDay() }, () => null);
    for (let i = 0; i < getDaysInMonth(viewMonth); i++) out.push(addDays(viewMonth, i));
    while (out.length % 7) out.push(null);
    return out;
  }, [viewMonth]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.monthNav}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => setViewMonth((m) => addMonths(m, -1))}
              style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color={colors.text} strokeWidth={2.25} />
            </Pressable>
            <Text style={styles.monthTitle}>{format(viewMonth, 'MMMM yyyy')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => setViewMonth((m) => addMonths(m, 1))}
              style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.text} strokeWidth={2.25} />
            </Pressable>
          </View>

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
                  onPress={() => {
                    onSelect(day);
                    onClose();
                  }}
                  style={styles.cell}
                >
                  <View style={[styles.day, active && styles.dayActive]}>
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    pressed: { opacity: 0.6 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      paddingHorizontal: 10,
      paddingTop: spacing.lg,
      paddingBottom: 10,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 6,
      marginBottom: spacing.md,
    },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthTitle: { fontSize: 17, fontWeight: '700', color: ink },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    day: {
      width: 40,
      height: 40,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayActive: { backgroundColor: colors.brand },
    dayText: { fontSize: 16, color: ink },
    dayTextToday: { color: colors.brand, fontWeight: '700' },
    dayTextActive: { color: colors.white, fontWeight: '600' },
    dot: {
      position: 'absolute',
      bottom: 3,
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
  });
}
