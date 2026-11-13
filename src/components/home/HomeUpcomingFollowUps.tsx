import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { isTomorrow } from 'date-fns/isTomorrow';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useFollowUpActions,
  type FollowUpTarget,
} from '@/components/followups/FollowUpActions';
import {
  followUpKind,
  followUpState,
  followUpTypeLabel,
  useMinuteClock,
} from '@/components/followups/followUpCalendar';
import { homePalette, type HomePalette } from '@/components/home/homePalette';
import {
  BuildingBlueIcon,
  HandsetPurpleIcon,
} from '@/components/home/QuickActionIcons';
import {
  ArrowRight01Icon,
  ArrowRightLongIcon,
  Calendar03Icon,
  HomeSolidIcon,
} from '@/components/icons/hugeicons';
import { useTheme } from '@/theme';
import type { MobileDashboard } from '@/types/api';
import { openPhoneDialer, openWhatsApp } from '@/utils/phone';

type QueueItem = MobileDashboard['upcomingFollowUps'][number];

type Props = {
  queue: QueueItem[];
};

const HOUSE_BLUE = '#2F5BE7';
const WHATSAPP_GREEN = '#1FAF5A';
/** Fixed: the dark theme's lighter danger red is too pale on the row. */
const OVERDUE_RED = '#D92D20';

const KIND_TONE = {
  todo: 'blue',
  event: 'purple',
  reminder: 'green',
} as const;

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

function whenLabel(due: Date) {
  const day = format(due, 'd MMM');
  const time = format(due, 'h:mm a');
  if (isToday(due)) return `Today, ${day} • ${time}`;
  if (isTomorrow(due)) return `Tomorrow, ${day} • ${time}`;
  return `${format(due, 'EEE')}, ${day} • ${time}`;
}

async function callLead(phone: string | null) {
  try {
    if (!(await openPhoneDialer(phone))) Alert.alert('Unable to start the call');
  } catch {
    Alert.alert('Unable to start the call');
  }
}

async function messageLead(phone: string | null) {
  try {
    if (!(await openWhatsApp(phone))) Alert.alert('Unable to open WhatsApp');
  } catch {
    Alert.alert('Unable to open WhatsApp');
  }
}

export function HomeUpcomingFollowUps({ queue }: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = homePalette(isDark);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const router = useRouter();
  const now = useMinuteClock();
  const actions = useFollowUpActions();

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headBar} />
        <Text style={styles.title} numberOfLines={1}>
          Upcoming Follow-ups
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all follow-ups"
          onPress={() => router.navigate('/(tabs)/follow-ups')}
          hitSlop={8}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllText}>See all</Text>
          <HugeiconsIcon
            icon={ArrowRightLongIcon}
            size={15}
            color={palette.link}
          />
        </Pressable>
      </View>

      {queue.length === 0 ? (
        <Text style={styles.empty}>
          No follow-ups lined up. Schedule the next touch from a lead.
        </Text>
      ) : (
        <View style={styles.list}>
          {queue.map((item) => {
            const due = new Date(item.dueAt);
            // The dashboard queue only lists Pending follow-ups.
            const state = followUpState({ status: 'PENDING', onTime: null }, due, now);
            const late = state === 'overdue' || state === 'missed';
            const kind = followUpKind(item.type);
            const tone = palette.tones[KIND_TONE[kind]];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.leadName}`}
                accessibilityHint="Long press for follow-up actions"
                onPress={() => router.push(`/leads/${item.leadId}`)}
                onLongPress={() => actions.openMenu(targetOf(item))}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.mark}>
                  {kind === 'event' ? (
                    <BuildingBlueIcon size={21} />
                  ) : (
                    <HugeiconsIcon
                      icon={HomeSolidIcon}
                      size={20}
                      color={isDark ? palette.tones.blue.fg : HOUSE_BLUE}
                    />
                  )}
                </View>

                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.leadName}
                    </Text>
                    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                      <Text
                        style={[styles.chipText, { color: tone.fg }]}
                        numberOfLines={1}
                      >
                        {followUpTypeLabel(item.type)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.whenRow}>
                    <HugeiconsIcon
                      icon={Calendar03Icon}
                      size={13}
                      color={late ? OVERDUE_RED : palette.inkSoft}
                      strokeWidth={1.8}
                    />
                    <Text
                      style={[styles.when, late && styles.whenLate]}
                      numberOfLines={1}
                    >
                      {late ? `Overdue · ${whenLabel(due)}` : whenLabel(due)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${item.leadName}`}
                  disabled={!item.leadPhone}
                  hitSlop={4}
                  onPress={() => void callLead(item.leadPhone)}
                  style={({ pressed }) => [
                    styles.action,
                    styles.actionCall,
                    (!item.leadPhone || pressed) && styles.dimmed,
                  ]}
                >
                  <HandsetPurpleIcon size={17} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`WhatsApp ${item.leadName}`}
                  disabled={!item.leadPhone}
                  hitSlop={4}
                  onPress={() => void messageLead(item.leadPhone)}
                  style={({ pressed }) => [
                    styles.action,
                    styles.actionChat,
                    (!item.leadPhone || pressed) && styles.dimmed,
                  ]}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={18}
                    color={WHATSAPP_GREEN}
                  />
                </Pressable>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={17}
                  color={palette.inkSoft}
                  strokeWidth={2}
                />
              </Pressable>
            );
          })}
        </View>
      )}

      {actions.sheets}
    </View>
  );
}

function createStyles(palette: HomePalette) {
  return StyleSheet.create({
    root: { gap: 12 },
    pressed: { opacity: 0.7 },
    dimmed: { opacity: 0.5 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headBar: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: palette.accent,
    },
    title: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: palette.ink,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    seeAllText: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: palette.link,
    },
    empty: {
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkSoft,
    },
    list: { gap: 6 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
    },
    mark: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.tones.blue.bg,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    name: {
      flexShrink: 1,
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: '700',
      color: palette.ink,
    },
    chip: {
      flexShrink: 0,
      maxWidth: '50%',
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: 999,
    },
    chipText: {
      fontSize: 10.5,
      lineHeight: 15,
      fontWeight: '600',
    },
    whenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    when: {
      flexShrink: 1,
      fontSize: 11.5,
      lineHeight: 15,
      color: palette.inkSoft,
    },
    whenLate: { color: OVERDUE_RED },
    action: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCall: { backgroundColor: palette.tones.purple.bg },
    actionChat: { backgroundColor: palette.tones.green.bg },
  });
}
