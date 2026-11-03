import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  initials,
  isClosedState,
  type FollowUpState,
  type KindTone,
} from '@/components/followups/followUpCalendar';
import {
  CheckIcon,
  CircleCheckIcon,
  Clock01Icon,
  ClockAlertIcon,
  MoreVerticalIcon,
} from '@/components/icons/hugeicons';
import { useTheme, type ThemeColors } from '@/theme';

type Props = {
  name: string;
  label: string;
  /** Icon inside the label badge — the same one the web admin shows. */
  labelIcon: IconSvgElement;
  due: Date;
  state: FollowUpState;
  tone: KindTone;
  /** Follow-up note, shown under the name when present. */
  note?: string | null;
  onPress: () => void;
  onPressIn?: () => void;
  /** Adds a ⋮ button for more actions. */
  onMore?: () => void;
  /** Adds a "mark as done" check while the follow-up is still open. */
  onComplete?: () => void;
};

const STATE_BADGE: Partial<
  Record<FollowUpState, { label: string; icon: IconSvgElement; tone: 'danger' | 'success' | 'warning' }>
> = {
  overdue: { label: 'Overdue', icon: ClockAlertIcon, tone: 'danger' },
  missed: { label: 'Missed', icon: ClockAlertIcon, tone: 'danger' },
  done: { label: 'Done', icon: CircleCheckIcon, tone: 'success' },
  late: { label: 'Done late', icon: CircleCheckIcon, tone: 'warning' },
};

/** Follow-up card shared by the Follow-ups timeline and Home. */
export function FollowUpCard({
  name,
  label,
  labelIcon,
  due,
  state,
  tone,
  note,
  onPress,
  onPressIn,
  onMore,
  onComplete,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const closed = isClosedState(state);
  const stateBadge = STATE_BADGE[state];
  const stateInk = stateBadge ? colors[stateBadge.tone] : colors.text;
  const stateSoft = stateBadge ? colors[`${stateBadge.tone}Soft`] : colors.surface;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tone.bg },
        closed && styles.closed,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {name}
        </Text>
        {closed ? (
          <View
            accessibilityRole="checkbox"
            accessibilityState={{ checked: true }}
            accessibilityLabel="Done"
            style={[styles.checkbox, { backgroundColor: stateInk, borderColor: stateInk }]}
          >
            <HugeiconsIcon icon={CheckIcon} size={16} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : onComplete ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: false }}
            accessibilityLabel="Mark follow-up as done"
            hitSlop={10}
            onPress={onComplete}
            style={({ pressed }) => [styles.checkbox, pressed && styles.pressed]}
          >
            <HugeiconsIcon icon={CheckIcon} size={16} color={colors.textMuted} strokeWidth={2.5} />
          </Pressable>
        ) : null}
        {onMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Follow-up options"
            hitSlop={10}
            onPress={onMore}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={20} color={colors.text} strokeWidth={1.8} />
          </Pressable>
        ) : null}
      </View>

      {note?.trim() ? (
        <Text style={styles.note} numberOfLines={2}>
          {note.trim()}
        </Text>
      ) : null}

      {/* Badges keep their full width and wrap to a new line rather than squeeze. */}
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: `${tone.accent}26` }]}>
          <HugeiconsIcon icon={labelIcon} size={13} color={tone.accent} strokeWidth={2} />
          <Text style={[styles.badgeText, { color: tone.accent }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {stateBadge ? (
          <View style={[styles.badge, { backgroundColor: stateSoft }]}>
            <HugeiconsIcon icon={stateBadge.icon} size={13} color={stateInk} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: stateInk }]} numberOfLines={1}>
              {stateBadge.label}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />
      <View style={styles.cardInline}>
        <View style={styles.cardTime}>
          <HugeiconsIcon icon={Clock01Icon} size={20} color={colors.text} strokeWidth={1.5} />
          <Text style={styles.cardTimeText}>{format(due, 'h:mm a')}</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: tone.accent }]}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    pressed: { opacity: 0.6 },
    card: { borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16 },
    // Done follow-ups stay visible for the record but step back.
    closed: { opacity: 0.72 },
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
      width: 26,
      height: 26,
      borderRadius: 7,
      borderWidth: 1.8,
      borderColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    more: { marginLeft: -4, marginRight: -6, paddingTop: 2 },
    note: { fontSize: 14, lineHeight: 19, color: ink, opacity: 0.8, marginTop: 6 },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      maxWidth: '100%',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
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
    cardTime: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
    cardTimeText: { fontSize: 15, color: ink },
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
