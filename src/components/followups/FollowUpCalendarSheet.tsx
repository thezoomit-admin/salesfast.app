import { HugeiconsIcon } from '@hugeicons/react-native';
import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { format } from 'date-fns/format';
import { getDaysInMonth } from 'date-fns/getDaysInMonth';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfMonth } from 'date-fns/startOfMonth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  dayDotColor,
  dayKey,
  groupByDay,
  kindTones,
  useMinuteClock,
} from '@/components/followups/followUpCalendar';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@/components/icons/hugeicons';
import { followUpMonthKey, followUpMonthQuery } from '@/features/leads/leadsApi';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;

type Props = {
  open: boolean;
  selected: Date;
  onSelect: (day: Date) => void;
  onClose: () => void;
};

/** Bottom sheet month calendar (same shell as AccountSwitchSheet); dots mark follow-ups. */
export function FollowUpCalendarSheet({ open, selected, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock().getTime();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected));
  const [mounted, setMounted] = useState(false);
  const [translateY] = useState(() => new Animated.Value(SHEET_OFFSCREEN));
  const [backdropOp] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);

  // Every open mounts the sheet and starts on the selected day's month.
  // Closing normally slides down first (runCloseAnimation unmounts, then
  // calls onClose); a close forced by the parent just hides it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setMounted(open);
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

  const animateClose = useCallback(
    () => {
      if (closing) return;
      setClosing(true);
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 0,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SHEET_OFFSCREEN,
          duration: CLOSE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        setClosing(false);
        if (!finished) return;
        setMounted(false);
        onClose();
      });
    },
    [backdropOp, closing, onClose, translateY]
  );

  useEffect(() => {
    if (open) {
      translateY.setValue(SHEET_OFFSCREEN);
      backdropOp.setValue(0);
      const frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOp, {
            toValue: 1,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open, translateY, backdropOp]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !closing,
        onMoveShouldSetPanResponder: (_, g) =>
          !closing && g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            animateClose();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [animateClose, closing, translateY]
  );

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={animateClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.backdropHit} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>{format(viewMonth, 'MMMM yyyy')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                hitSlop={6}
                onPress={() => setViewMonth((m) => addMonths(m, -1))}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color={colors.text} strokeWidth={2.25} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                hitSlop={6}
                onPress={() => setViewMonth((m) => addMonths(m, 1))}
                style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={colors.text} strokeWidth={2.25} />
              </Pressable>
            </View>
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
              const dotColor = dayDotColor(byDay.get(dayKey(day)), now, tones, colors.danger);
              return (
                <Pressable
                  key={dayKey(day)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    format(day, 'EEEE d MMMM') + (dotColor ? ', has follow-ups' : '')
                  }
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onSelect(day);
                    animateClose();
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
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    root: { flex: 1 },
    backdropFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: { flex: 1 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 20,
    },
    dragZone: { paddingTop: 2, paddingBottom: 4 },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: 14,
      backgroundColor: colors.border,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    title: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.72 },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 6 },
    cell: {
      width: `${100 / 7}%`,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    day: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
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
