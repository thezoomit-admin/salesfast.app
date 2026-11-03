import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { memo, useMemo } from 'react';
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
  followUpKind,
  followUpLabel,
  kindTones,
  leadName,
  NO_FOLLOW_UPS,
  statusTypeIcon,
  useMinuteClock,
  type DayFollowUp,
} from '@/components/followups/followUpCalendar';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@/components/icons/hugeicons';
import { FollowUpCard } from '@/components/followups/FollowUpCard';
import { WeekStrip } from '@/components/followups/WeekStrip';
import { HeaderIconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import type { LeadListItem } from '@/types/api';
import { useTheme, type ThemeColors } from '@/theme';

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
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const now = useMinuteClock();

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

      <View style={styles.weekStrip}>
        <WeekStrip selected={selected} onSelect={onSelect} />
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
                    name={leadName(lead)}
                    label={followUpLabel(lead)}
                    labelIcon={statusTypeIcon(followUpLabel(lead))}
                    kind={followUpKind(lead)}
                    due={due}
                    overdue={due.getTime() < now.getTime()}
                    tone={tones[followUpKind(lead)]}
                    note={lead.lastNote}
                    onPress={() => onOpenLead(lead)}
                    onPressIn={() => onPressInLead(lead)}
                  />
                ))}
              </View>
            </View>
          );
        })}
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
