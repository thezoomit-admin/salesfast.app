import { addMonths, format, isBefore, isSameDay, startOfDay, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  label: string;
  value: Date | null;
  onChange: (next: Date | null) => void;
  /** Disable calendar days before today (web parity). */
  disablePastDays?: boolean;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MINUTE_STEP = 30;

function buildTimeSlots() {
  const slots: { h: number; m: number; label: string; ampm: string }[] = [];
  for (let mins = 0; mins < 24 * 60; mins += MINUTE_STEP) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    slots.push({
      h,
      m,
      label: format(d, 'hh:mm'),
      ampm: format(d, 'a').toUpperCase(),
    });
  }
  return slots;
}

const TIME_SLOTS = buildTimeSlots();

/**
 * Web DateTimeField parity — two-line field that opens a calendar card,
 * then a 30-min time slot list.
 */
export function FollowupDateTimeField({
  label,
  value,
  onChange,
  disablePastDays = true,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value ?? new Date())
  );
  const [draftDay, setDraftDay] = useState<Date | null>(value);

  const today = startOfDay(new Date());

  function openPicker() {
    setViewMonth(startOfMonth(value ?? new Date()));
    setDraftDay(value);
    setStep('date');
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setStep('date');
  }

  function selectDay(day: Date) {
    const base = value ?? new Date();
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    setDraftDay(next);
    setStep('time');
  }

  function selectTime(h: number, m: number) {
    const base = draftDay ?? value ?? new Date();
    const next = new Date(base);
    next.setHours(h, m, 0, 0);
    onChange(next);
    closePicker();
  }

  const monthStart = startOfMonth(viewMonth);
  const lead = monthStart.getDay();
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  ).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
      return d;
    }),
  ];

  const selectedMin = value
    ? value.getHours() * 60 + value.getMinutes()
    : null;

  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={styles.fieldIcon}>📅</Text>
        <View style={styles.fieldText}>
          <Text style={styles.caption}>Date & time</Text>
          <Text
            style={[styles.value, !value && { color: colors.textMuted, fontWeight: '400' }]}
            numberOfLines={1}
          >
            {value ? format(value, 'MMMM d, yyyy · hh:mm a') : 'Select date & time'}
          </Text>
        </View>
        {value ? (
          <Pressable
            hitSlop={8}
            onPress={() => onChange(null)}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.backdrop} onPress={closePicker}>
          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation?.()}
          >
            {step === 'date' ? (
              <>
                <View style={styles.monthNav}>
                  <Pressable
                    style={styles.navBtn}
                    onPress={() => setViewMonth((m) => addMonths(m, -1))}
                  >
                    <Text style={styles.navBtnText}>‹</Text>
                  </Pressable>
                  <Text style={styles.monthTitle}>
                    {format(viewMonth, 'MMMM yyyy')}
                  </Text>
                  <Pressable
                    style={styles.navBtn}
                    onPress={() => setViewMonth((m) => addMonths(m, 1))}
                  >
                    <Text style={styles.navBtnText}>›</Text>
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAYS.map((d) => (
                    <Text key={d} style={styles.weekday}>
                      {d}
                    </Text>
                  ))}
                </View>

                <View style={styles.dayGrid}>
                  {cells.map((d, i) => {
                    if (!d) return <View key={`b${i}`} style={styles.dayCell} />;
                    const selected = !!draftDay && isSameDay(d, draftDay);
                    const isToday = isSameDay(d, today);
                    const off =
                      disablePastDays && isBefore(startOfDay(d), today);
                    return (
                      <View key={d.toISOString()} style={styles.dayCell}>
                        <Pressable
                          disabled={off}
                          onPress={() => selectDay(d)}
                          style={[
                            styles.dayBtn,
                            selected && styles.dayBtnSelected,
                            off && styles.dayBtnOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              selected && styles.dayTextSelected,
                              off && styles.dayTextOff,
                            ]}
                          >
                            {d.getDate()}
                          </Text>
                          {isToday && !selected ? (
                            <View style={styles.todayDot} />
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.footer}>
                  <Pressable
                    onPress={() => {
                      setViewMonth(startOfMonth(today));
                      selectDay(today);
                    }}
                    disabled={disablePastDays && false}
                  >
                    <Text style={styles.todayLink}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={styles.clearFooterBtn}
                    onPress={() => {
                      onChange(null);
                      closePicker();
                    }}
                  >
                    <Text style={styles.clearFooterText}>Clear</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.timeHeader}>
                  <Pressable onPress={() => setStep('date')} hitSlop={8}>
                    <Text style={styles.backLink}>‹ Back</Text>
                  </Pressable>
                  <Text style={styles.timeTitle}>
                    {draftDay
                      ? format(draftDay, 'EEE, MMM d')
                      : 'Pick time'}
                  </Text>
                  <View style={{ width: 48 }} />
                </View>
                <ScrollView style={styles.timeList} nestedScrollEnabled>
                  {TIME_SLOTS.map((slot) => {
                    const mins = slot.h * 60 + slot.m;
                    const selected = mins === selectedMin;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => selectTime(slot.h, slot.m)}
                        style={[
                          styles.timeRow,
                          selected && styles.timeRowSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeLabel,
                            selected && styles.timeLabelSelected,
                          ]}
                        >
                          {slot.label}
                        </Text>
                        <Text
                          style={[
                            styles.timeAmpm,
                            selected && styles.timeLabelSelected,
                          ]}
                        >
                          {slot.ampm}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    fieldLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '600',
      marginBottom: 8,
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    fieldIcon: { fontSize: 18 },
    fieldText: { flex: 1, minWidth: 0 },
    caption: {
      fontSize: 12,
      color: colors.textMuted,
    },
    value: {
      marginTop: 2,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    clearBtn: {
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearText: { color: colors.textSecondary, fontSize: 12 },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      maxHeight: '80%',
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    navBtnText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: '600',
      lineHeight: 22,
    },
    monthTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    weekRow: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginBottom: 4,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    dayGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.2857%',
      alignItems: 'center',
      paddingVertical: 3,
    },
    dayBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBtnSelected: {
      backgroundColor: colors.brand,
    },
    dayBtnOff: { opacity: 0.35 },
    dayText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    dayTextSelected: { color: colors.white, fontWeight: '700' },
    dayTextOff: { color: colors.textMuted },
    todayDot: {
      position: 'absolute',
      bottom: 4,
      width: 4,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.brand,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      marginTop: spacing.md,
      paddingTop: spacing.md,
    },
    todayLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    clearFooterBtn: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.md,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    clearFooterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    timeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    backLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand,
      width: 64,
    },
    timeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    timeList: { maxHeight: 320 },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: radii.md,
    },
    timeRowSelected: {
      backgroundColor: colors.surfaceMuted,
    },
    timeLabel: {
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      color: colors.textSecondary,
    },
    timeAmpm: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    timeLabelSelected: {
      color: colors.text,
      fontWeight: '700',
    },
  });
}
