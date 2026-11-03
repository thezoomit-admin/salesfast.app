import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns/format';
import { isSameDay } from 'date-fns/isSameDay';
import { isToday } from 'date-fns/isToday';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Add01Icon,
  Bookmark02Icon,
  MoreVerticalIcon,
} from '@/components/icons/hugeicons';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  queue: QueueItem[];
};

/** Brand-forward card fills (reference used multi-color blocks). */
const CARD_TONES = [
  { bg: '#F2461C', soft: 'rgba(255,255,255,0.72)' },
  { bg: '#15202C', soft: 'rgba(255,255,255,0.72)' },
  { bg: '#E36A4A', soft: 'rgba(255,255,255,0.78)' },
  { bg: '#1A4D4E', soft: 'rgba(255,255,255,0.72)' },
] as const;

function typeLabel(type: string | null) {
  if (!type?.trim()) return 'Follow-up';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneFor(item: QueueItem, index: number, now: number) {
  if (new Date(item.dueAt).getTime() < now) {
    return { bg: '#F04438', soft: 'rgba(255,255,255,0.75)' };
  }
  return CARD_TONES[index % CARD_TONES.length];
}

export function UpcomingFollowupsTimeline({ queue }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const now = Date.now();

  const items = useMemo(
    () =>
      [...queue].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      ),
    [queue]
  );

  const nowMarkerIndex = useMemo(() => {
    if (items.length === 0) return -1;
    for (let i = 0; i < items.length; i++) {
      if (new Date(items[i].dueAt).getTime() > now) return i;
    }
    return -1;
  }, [items, now]);

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
            styles.addBtn,
            pressed && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={Add01Icon}
            size={18}
            color={colors.brand}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No follow-ups lined up. Schedule the next touch from a lead.
          </Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {items.map((item, index) => {
            const due = new Date(item.dueAt);
            const tone = toneFor(item, index, now);
            const showNowBefore =
              nowMarkerIndex === index &&
              isToday(due) &&
              due.getTime() > now;
            const showGap =
              index > 0 &&
              isSameDay(due, new Date(items[index - 1].dueAt)) &&
              due.getTime() - new Date(items[index - 1].dueAt).getTime() >=
                60 * 60 * 1000;

            return (
              <View key={item.id}>
                {showNowBefore ? <NowMarker styles={styles} colors={colors} /> : null}

                {showGap ? (
                  <View style={styles.slotRow}>
                    <Text style={styles.timeCol} />
                    <View style={styles.rail}>
                      <View style={styles.railLine} />
                    </View>
                    <View style={styles.breakCard}>
                      <Text style={styles.breakText}>Open slot</Text>
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                  style={({ pressed }) => [
                    styles.slotRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{format(due, 'HH:mm')}</Text>
                    {!isToday(due) ? (
                      <Text style={styles.dayText}>{format(due, 'dd MMM')}</Text>
                    ) : null}
                  </View>

                  <View style={styles.rail}>
                    <View
                      style={[styles.railDot, { borderColor: tone.bg }]}
                    />
                    {index < items.length - 1 ? (
                      <View style={styles.railLine} />
                    ) : null}
                  </View>

                  <View style={[styles.eventCard, { backgroundColor: tone.bg }]}>
                    <View style={styles.eventTop}>
                      <View style={styles.eventCopy}>
                        <Text
                          style={[styles.eventCategory, { color: tone.soft }]}
                          numberOfLines={1}
                        >
                          {typeLabel(item.type)}
                          {new Date(item.dueAt).getTime() < now ? ' · Overdue' : ''}
                        </Text>
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {item.leadName}
                        </Text>
                      </View>
                      <HugeiconsIcon
                        icon={MoreVerticalIcon}
                        size={16}
                        color="rgba(255,255,255,0.85)"
                        strokeWidth={1.8}
                      />
                    </View>

                    <View style={styles.eventBottom}>
                      <View style={styles.avatarStack}>
                        <UserAvatar name={item.leadName} size={26} />
                      </View>
                      <HugeiconsIcon
                        icon={Bookmark02Icon}
                        size={16}
                        color="rgba(255,255,255,0.85)"
                        strokeWidth={1.8}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })}

          {nowMarkerIndex < 0 &&
          items.some((item) => isToday(new Date(item.dueAt))) ? (
            <NowMarker styles={styles} colors={colors} />
          ) : null}
        </View>
      )}
    </View>
  );
}

function NowMarker({
  styles,
  colors,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.nowRow} pointerEvents="none">
      <Text style={styles.timeCol} />
      <View style={styles.nowRail}>
        <View style={[styles.nowDot, { backgroundColor: colors.brand }]} />
      </View>
      <View style={[styles.nowLine, { backgroundColor: colors.brand }]} />
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { gap: 12 },
    pressed: { opacity: 0.9 },
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
    addBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.brandSoft : colors.primary50,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    timeline: {
      gap: 0,
    },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
      minHeight: 96,
      paddingBottom: 12,
    },
    timeCol: {
      width: 44,
      paddingTop: 10,
      alignItems: 'flex-end',
    },
    timeText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    dayText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 2,
    },
    rail: {
      width: 14,
      alignItems: 'center',
      paddingTop: 14,
    },
    railDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surface,
      borderWidth: 2.5,
      zIndex: 1,
    },
    railLine: {
      flex: 1,
      width: StyleSheet.hairlineWidth * 2,
      backgroundColor: colors.border,
      marginTop: 4,
      minHeight: 24,
    },
    eventCard: {
      flex: 1,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 14,
      minHeight: 88,
    },
    eventTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    eventCopy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    eventCategory: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '500',
    },
    eventTitle: {
      ...typography.subtitle,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    eventBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    avatarStack: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    breakCard: {
      flex: 1,
      borderRadius: 16,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surfaceMuted : '#F3F5F7',
      overflow: 'hidden',
    },
    breakText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.brand,
    },
    nowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 8,
      marginTop: -4,
    },
    nowRail: {
      width: 14,
      alignItems: 'center',
    },
    nowDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    nowLine: {
      flex: 1,
      height: 2,
      borderRadius: 1,
    },
  });
}
