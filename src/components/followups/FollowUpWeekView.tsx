import { HugeiconsIcon } from '@hugeicons/react-native';
import { addDays } from 'date-fns/addDays';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { startOfWeek } from 'date-fns/startOfWeek';
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
  initials,
  kindTones,
  leadName,
  NO_FOLLOW_UPS,
  useMinuteClock,
  type DayFollowUp,
  type KindTone,
} from '@/components/followups/followUpCalendar';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  Notification01Icon,
} from '@/components/icons/hugeicons';
import { HeaderIconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import type { LeadListItem } from '@/types/api';
import { radii, useTheme, type ThemeColors } from '@/theme';

/** The timeline always covers working hours; earlier/later slots appear when used. */
const DAY_START_HOUR = 8;
const DAY_END_HOUR = 18;
const HOUR_MIN_HEIGHT = 112;
const NOW_DASHES = 80;

type Props = {
  selected: Date;
  byDay: Map<string, DayFollowUp[]>;
  loading: boolean;
  errorMessage: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (day: Date) => void;
  onShiftWeek: (delta: number) => void;
  onPickDate: () => void;
  onOpenLead: (lead: LeadListItem) => void;
  onPressInLead: (lead: LeadListItem) => void;
};

function hourLabel(hour: number) {
  return { value: hour % 12 === 0 ? 12 : hour % 12, suffix: hour < 12 ? 'AM' : 'PM' };
}

function FollowUpWeekViewImpl({
  selected,
  byDay,
  loading,
  errorMessage,
  refreshing,
  onRefresh,
  onSelect,
  onShiftWeek,
  onPickDate,
  onOpenLead,
  onPressInLead,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock();

  const week = useMemo(() => {
    const start = startOfWeek(selected);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selected]);

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

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={format(selected, 'd MMM, yy EEEE')}
        showBack={false}
        onTitlePress={onPickDate}
        right={
          <>
            <HeaderIconButton label="Previous week" onPress={() => onShiftWeek(-1)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
            <HeaderIconButton label="Next week" onPress={() => onShiftWeek(1)}>
              <HugeiconsIcon icon={ArrowRight01Icon} size={22} color={colors.text} />
            </HeaderIconButton>
          </>
        }
      />

      <View style={styles.stripCard}>
        <View style={styles.strip}>
          {week.map((day) => {
            const active = isSameDay(day, selected);
            const today = isToday(day);
            return (
              <Pressable
                key={dayKey(day)}
                accessibilityRole="button"
                accessibilityLabel={format(day, 'EEEE d MMMM')}
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(day)}
                style={styles.stripDay}
              >
                <Text style={[styles.stripName, active && styles.stripNameActive]}>
                  {format(day, 'EEE')}
                </Text>
                <View style={[styles.stripBar, active && styles.stripBarActive]} />
                <View style={[styles.stripDate, active && styles.stripDateActive]}>
                  <Text
                    style={[
                      styles.stripDateText,
                      today && !active && styles.stripDateToday,
                      active && styles.stripDateTextActive,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
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

        <View style={styles.timelineCard}>
          {hours.map((hour) => {
            const label = hourLabel(hour);
            const slot = items.filter(({ due }) => due.getHours() === hour);
            const nowHere = showNow && now.getHours() === hour;
            return (
              <View key={hour} style={styles.hourRow}>
                {nowHere ? (
                  <View
                    pointerEvents="none"
                    style={[styles.nowLine, { top: `${(now.getMinutes() / 60) * 100}%` }]}
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
                  {slot.map(({ lead, due }) => (
                    <FollowUpCard
                      key={lead.id}
                      lead={lead}
                      due={due}
                      overdue={due.getTime() < now.getTime()}
                      tone={tones[followUpKind(lead)]}
                      styles={styles}
                      colors={colors}
                      onPress={onOpenLead}
                      onPressIn={onPressInLead}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function FollowUpCard({
  lead,
  due,
  overdue,
  tone,
  styles,
  colors,
  onPress,
  onPressIn,
}: {
  lead: LeadListItem;
  due: Date;
  overdue: boolean;
  tone: KindTone;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  onPress: (lead: LeadListItem) => void;
  onPressIn: (lead: LeadListItem) => void;
}) {
  const kind = followUpKind(lead);
  const name = leadName(lead);
  const time = (
    <View style={styles.cardTime}>
      <HugeiconsIcon icon={Clock01Icon} size={20} color={colors.text} strokeWidth={1.5} />
      <Text style={styles.cardTimeText}>
        {format(due, 'h:mm a')}
        {overdue ? <Text style={styles.overdue}> · Overdue</Text> : null}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={() => onPress(lead)}
      onPressIn={() => onPressIn(lead)}
      style={({ pressed }) => [styles.card, { backgroundColor: tone.bg }, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {name}
        </Text>
        {kind === 'todo' ? (
          <View style={styles.checkbox} />
        ) : (
          <HugeiconsIcon
            icon={kind === 'event' ? Calendar03Icon : Notification01Icon}
            size={24}
            color={colors.text}
            strokeWidth={1.5}
          />
        )}
      </View>

      {kind === 'reminder' ? (
        <View style={[styles.cardInline, styles.cardInlineReminder]}>
          <Text style={[styles.cardKind, styles.cardKindInline]} numberOfLines={1}>
            {followUpLabel(lead)}
          </Text>
          {time}
        </View>
      ) : (
        <>
          <Text style={styles.cardKind} numberOfLines={1}>
            {followUpLabel(lead)}
          </Text>
          <View style={styles.cardDivider} />
          <View style={styles.cardInline}>
            {time}
            <View style={[styles.avatar, { backgroundColor: tone.accent }]}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

export const FollowUpWeekView = memo(FollowUpWeekViewImpl);

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  const pageWash = isDark ? colors.background : '#EEF1F4';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: pageWash },
    pressed: { opacity: 0.6 },
    // White section cards on the Home page wash.
    stripCard: {
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 6,
      paddingTop: 14,
      paddingBottom: 12,
      borderRadius: 22,
      backgroundColor: colors.surface,
    },
    strip: { flexDirection: 'row' },
    stripDay: { flex: 1, alignItems: 'center' },
    stripName: { fontSize: 15, color: colors.textMuted },
    stripNameActive: { color: ink, fontWeight: '600' },
    stripBar: { width: 44, height: 2, borderRadius: 1, marginTop: 6, marginBottom: 10 },
    stripBarActive: { backgroundColor: colors.brand },
    stripDate: {
      width: 40,
      height: 40,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stripDateActive: { backgroundColor: colors.brand },
    stripDateText: { fontSize: 18, color: colors.textMuted },
    stripDateToday: { color: colors.brand, fontWeight: '700' },
    stripDateTextActive: { color: colors.white, fontWeight: '600' },
    timeline: { flex: 1 },
    timelineContent: { paddingHorizontal: 16, paddingBottom: 24 },
    timelineCard: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
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
    card: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16 },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardTitle: {
      flex: 1,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: ink,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.6,
      borderColor: colors.text,
    },
    cardKind: { fontSize: 14, color: colors.textSecondary, marginTop: 10 },
    cardDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      marginVertical: 14,
    },
    cardInline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardInlineReminder: { marginTop: 12 },
    cardKindInline: { marginTop: 0, flexShrink: 1 },
    cardTime: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardTimeText: { fontSize: 15, color: ink },
    overdue: { color: colors.danger, fontWeight: '600' },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });
}
