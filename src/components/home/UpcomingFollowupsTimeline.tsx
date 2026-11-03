import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFollowUpActions, type FollowUpTarget } from '@/components/followups/FollowUpActions';
import { FollowUpCard } from '@/components/followups/FollowUpCard';
import {
  dayKey,
  followUpKind,
  followUpState,
  followUpTypeLabel,
  followupTypeIcon,
  kindTones,
  useMinuteClock,
} from '@/components/followups/followUpCalendar';
import { ArrowRight01Icon } from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  queue: QueueItem[];
};

type HourSlot = { hour: number; items: { item: QueueItem; due: Date }[] };
type DaySection = { key: string; day: Date; hours: HourSlot[] };

const NOW_DASHES = 60;

function dayTitle(day: Date) {
  if (isToday(day)) return 'Today';
  if (isTomorrow(day)) return 'Tomorrow';
  return format(day, 'EEE, d MMM');
}

function hourLabel(hour: number) {
  return { value: hour % 12 === 0 ? 12 : hour % 12, suffix: hour < 12 ? 'AM' : 'PM' };
}

/** Sorted follow-ups grouped by day, then by hour — same slots as the Follow-ups tab. */
function groupQueue(queue: QueueItem[]) {
  const sorted = queue
    .map((item) => ({ item, due: new Date(item.dueAt) }))
    .sort((a, b) => a.due.getTime() - b.due.getTime());
  const days: DaySection[] = [];
  for (const entry of sorted) {
    const key = dayKey(entry.due);
    let section = days[days.length - 1];
    if (section?.key !== key) {
      section = { key, day: entry.due, hours: [] };
      days.push(section);
    }
    const hour = entry.due.getHours();
    const slot = section.hours[section.hours.length - 1];
    if (slot?.hour === hour) slot.items.push(entry);
    else section.hours.push({ hour, items: [entry] });
  }
  return days;
}

function targetOf(item: QueueItem): FollowUpTarget {
  return {
    leadId: item.leadId,
    leadName: item.leadName,
    leadPhone: item.leadPhone,
    type: item.type,
    dueAt: item.dueAt,
    open: true,
  };
}

export function UpcomingFollowupsTimeline({ queue }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const router = useRouter();
  const now = useMinuteClock();
  const actions = useFollowUpActions();

  const days = useMemo(() => groupQueue(queue), [queue]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming follow-ups</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open follow-ups"
          onPress={() => router.navigate('/(tabs)/follow-ups')}
          hitSlop={6}
          style={({ pressed }) => [
            styles.arrowBtn,
            pressed && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={colors.brand}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {days.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No follow-ups lined up. Schedule the next touch from a lead.
          </Text>
        </View>
      ) : (
        days.map((section) => (
          <View key={section.key}>
            <Text style={styles.dayTitle}>{dayTitle(section.day)}</Text>
            {section.hours.map(({ hour, items }) => {
              const label = hourLabel(hour);
              const nowHere = isToday(section.day) && now.getHours() === hour;
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
                    {items.map(({ item, due }) => (
                      <FollowUpCard
                        key={item.id}
                        name={item.leadName}
                        label={followUpTypeLabel(item.type)}
                        labelIcon={followupTypeIcon(item.type)}
                        due={due}
                        // The dashboard queue only lists Pending follow-ups.
                        state={followUpState({ status: 'PENDING', onTime: null }, due, now)}
                        tone={tones[followUpKind(item.type)]}
                        note={item.note}
                        onPress={() => router.push(`/leads/${item.leadId}`)}
                        onMore={() => actions.openMenu(targetOf(item))}
                        onComplete={() => actions.openComplete(targetOf(item))}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        ))
      )}

      {actions.sheets}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 4,
    },
    pressed: { opacity: 0.6 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 2,
    },
    title: {
      ...typography.subtitle,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    arrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: {
      paddingHorizontal: 2,
      paddingVertical: 8,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    dayTitle: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textMuted,
      paddingTop: 10,
      paddingBottom: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    hourRow: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    hourLabel: { width: 56, alignItems: 'center', paddingTop: 16 },
    hourValue: { fontSize: 19, color: colors.textMuted },
    hourSuffix: { fontSize: 13, color: colors.textMuted, marginTop: -2 },
    slot: { flex: 1, gap: 6, paddingVertical: 6 },
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
