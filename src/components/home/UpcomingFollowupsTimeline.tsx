import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ArrowRight01Icon,
  Bookmark02Icon,
  MoreVerticalIcon,
} from '@/components/icons/hugeicons';
import { FollowUpActionsSheet } from '@/components/home/FollowUpActionsSheet';
import { RescheduleFollowUpSheet } from '@/components/home/RescheduleFollowUpSheet';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  queue: QueueItem[];
};

type MenuTarget = QueueItem;

type RescheduleTarget = {
  leadId: number;
  leadName: string;
  followUpType: string | null;
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

function dialablePhone(raw: string | null | undefined) {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}

export function UpcomingFollowupsTimeline({ queue }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const now = Date.now();
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [reschedule, setReschedule] = useState<RescheduleTarget | null>(null);

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

  const openReschedule = (item: QueueItem) => {
    setMenu(null);
    setReschedule({
      leadId: item.leadId,
      leadName: item.leadName,
      followUpType: item.type,
    });
  };

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
            const overdue = due.getTime() < now;
            const tone = toneFor(item, index, now);
            const showNowBefore =
              nowMarkerIndex === index &&
              isToday(due) &&
              due.getTime() > now;

            return (
              <View key={item.id}>
                {showNowBefore ? (
                  <NowMarker styles={styles} colors={colors} />
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
                          {overdue ? ' · Overdue' : ''}
                        </Text>
                        <Text style={styles.eventTitle} numberOfLines={2}>
                          {item.leadName}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Follow-up options"
                        hitSlop={10}
                        onPress={() => setMenu(item)}
                        style={({ pressed }) => [
                          styles.moreBtn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <HugeiconsIcon
                          icon={MoreVerticalIcon}
                          size={16}
                          color="rgba(255,255,255,0.85)"
                          strokeWidth={1.8}
                        />
                      </Pressable>
                    </View>

                    <View style={styles.eventBottom}>
                      <Text style={[styles.followTime, { color: tone.soft }]}>
                        {format(due, 'h:mm a')}
                        {!isToday(due) ? ` · ${format(due, 'dd MMM')}` : ''}
                      </Text>
                      {overdue ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Reschedule follow-up"
                          hitSlop={6}
                          onPress={() => openReschedule(item)}
                          style={({ pressed }) => [
                            styles.rescheduleBtn,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.rescheduleText}>Reschedule</Text>
                        </Pressable>
                      ) : (
                        <HugeiconsIcon
                          icon={Bookmark02Icon}
                          size={16}
                          color="rgba(255,255,255,0.85)"
                          strokeWidth={1.8}
                        />
                      )}
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

      <FollowUpActionsSheet
        open={!!menu}
        leadName={menu?.leadName ?? ''}
        leadPhone={menu?.leadPhone}
        followUpType={menu?.type ?? null}
        dueAt={menu?.dueAt ?? null}
        onClose={() => setMenu(null)}
        onOpenLead={() => {
          const leadId = menu?.leadId;
          if (leadId != null) router.push(`/leads/${leadId}`);
        }}
        onReschedule={() => {
          if (menu) {
            setReschedule({
              leadId: menu.leadId,
              leadName: menu.leadName,
              followUpType: menu.type,
            });
          }
        }}
        onCall={
          dialablePhone(menu?.leadPhone)
            ? () => {
                const phone = dialablePhone(menu?.leadPhone);
                if (phone) void Linking.openURL(`tel:${phone}`);
              }
            : undefined
        }
      />

      <RescheduleFollowUpSheet
        open={!!reschedule}
        leadId={reschedule?.leadId ?? 0}
        leadName={reschedule?.leadName ?? ''}
        followUpType={reschedule?.followUpType ?? null}
        onClose={() => setReschedule(null)}
      />
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

function createStyles(colors: ThemeColors, _isDark: boolean) {
  return StyleSheet.create({
    root: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
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
    arrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyCard: {
      borderRadius: 18,
      paddingHorizontal: 2,
      paddingVertical: 8,
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
    moreBtn: {
      padding: 2,
      marginTop: -2,
      marginRight: -2,
    },
    eventBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    followTime: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    rescheduleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.55)',
    },
    rescheduleText: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
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
