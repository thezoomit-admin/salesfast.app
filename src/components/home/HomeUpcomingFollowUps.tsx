import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  useFollowUpActions,
  type FollowUpTarget,
} from '@/components/followups/FollowUpActions';
import {
  followUpKind,
  followUpState,
  followUpTypeLabel,
  followupTypeIcon,
  kindTones,
  useMinuteClock,
} from '@/components/followups/followUpCalendar';
import { HomeSection } from '@/components/home/HomeSection';
import {
  CallIcon,
  CheckIcon,
  MoreVerticalIcon,
} from '@/components/icons/hugeicons';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  queue: QueueItem[];
};

/** Fixed: the dark theme's lighter danger red is too pale under white text. */
const OVERDUE_TAG = '#D92D20';

function targetOf(item: QueueItem): FollowUpTarget {
  return {
    followUpId: item.id,
    leadId: item.leadId,
    leadName: item.leadName,
    leadPhone: item.leadPhone,
    type: item.type,
    dueAt: item.dueAt,
    open: true,
  };
}

function dayTag(due: Date) {
  if (isToday(due)) return 'Today';
  if (isTomorrow(due)) return 'Tomorrow';
  return format(due, 'EEE, d MMM');
}

export function HomeUpcomingFollowUps({ queue }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tones = useMemo(() => kindTones(isDark), [isDark]);
  const router = useRouter();
  const now = useMinuteClock();
  const actions = useFollowUpActions();

  return (
    <HomeSection
      title="Upcoming follow-ups"
      onSeeAll={() => router.navigate('/(tabs)/follow-ups')}
    >
      {queue.length === 0 ? (
        <Text style={styles.empty}>
          No follow-ups lined up. Schedule the next touch from a lead.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.slider}
          contentContainerStyle={styles.sliderRow}
        >
          {queue.map((item) => {
            const due = new Date(item.dueAt);
            // The dashboard queue only lists Pending follow-ups.
            const state = followUpState({ status: 'PENDING', onTime: null }, due, now);
            const late = state === 'overdue' || state === 'missed';
            const tone = tones[followUpKind(item.type)];
            return (
              <View key={item.id} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.leadName}`}
                  onPress={() => router.push(`/leads/${item.leadId}`)}
                  style={({ pressed }) => [styles.top, pressed && styles.pressed]}
                >
                  <View style={[styles.mark, { backgroundColor: tone.bg }]}>
                    <HugeiconsIcon
                      icon={followupTypeIcon(item.type)}
                      size={22}
                      color={tone.accent}
                      strokeWidth={1.7}
                    />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.leadName}
                      </Text>
                      <Text style={styles.time}>{format(due, 'h:mm a')}</Text>
                    </View>
                    <Text style={styles.type} numberOfLines={1}>
                      {followUpTypeLabel(item.type)}
                    </Text>
                    <View
                      style={[
                        styles.tag,
                        { backgroundColor: late ? OVERDUE_TAG : colors.brand },
                      ]}
                    >
                      <Text style={styles.tagText}>
                        {late ? `Overdue · ${dayTag(due)}` : dayTag(due)}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                <View style={styles.footer}>
                  <HugeiconsIcon
                    icon={CallIcon}
                    size={15}
                    color={colors.textMuted}
                    strokeWidth={1.8}
                  />
                  <Text style={styles.phone} numberOfLines={1}>
                    {item.leadPhone || 'No phone number'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Complete follow-up for ${item.leadName}`}
                    hitSlop={8}
                    onPress={() => actions.openComplete(targetOf(item))}
                    style={({ pressed }) => [styles.done, pressed && styles.pressed]}
                  >
                    <HugeiconsIcon
                      icon={CheckIcon}
                      size={14}
                      color={colors.success}
                      strokeWidth={2.4}
                    />
                    <Text style={styles.doneText}>Done</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`More actions for ${item.leadName}`}
                    hitSlop={8}
                    onPress={() => actions.openMenu(targetOf(item))}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <HugeiconsIcon
                      icon={MoreVerticalIcon}
                      size={18}
                      color={colors.textSecondary}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {actions.sheets}
    </HomeSection>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.7 },
    empty: {
      ...typography.caption,
      lineHeight: 18,
      color: colors.textMuted,
    },
    slider: { marginHorizontal: -spacing.lg },
    sliderRow: { gap: 10, paddingHorizontal: spacing.lg },
    card: {
      width: 280,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    top: {
      flexDirection: 'row',
      gap: 12,
      padding: 14,
    },
    mark: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      gap: 3,
    },
    titleRow: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: {
      ...typography.subtitle,
      flexShrink: 1,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    time: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.brand,
    },
    type: {
      ...typography.caption,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    tag: {
      marginTop: 2,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    tagText: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: colors.white,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    phone: {
      ...typography.caption,
      flex: 1,
      minWidth: 0,
      color: colors.textSecondary,
    },
    done: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    doneText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.success,
    },
  });
}
