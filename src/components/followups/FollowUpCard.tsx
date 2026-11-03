import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  initials,
  type FollowUpKind,
  type KindTone,
} from '@/components/followups/followUpCalendar';
import {
  Calendar03Icon,
  Clock01Icon,
  MoreVerticalIcon,
  Notification01Icon,
} from '@/components/icons/hugeicons';
import { useTheme, type ThemeColors } from '@/theme';

type Props = {
  name: string;
  label: string;
  kind: FollowUpKind;
  due: Date;
  overdue: boolean;
  tone: KindTone;
  /** Follow-up note, shown under the name when present. */
  note?: string | null;
  onPress: () => void;
  onPressIn?: () => void;
  /** Adds a ⋮ button beside the kind icon. */
  onMore?: () => void;
};

/** Follow-up card shared by the Follow-ups timeline and Home. */
export function FollowUpCard({
  name,
  label,
  kind,
  due,
  overdue,
  tone,
  note,
  onPress,
  onPressIn,
  onMore,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
      onPress={onPress}
      onPressIn={onPressIn}
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

      {kind === 'reminder' ? (
        <View style={[styles.cardInline, styles.cardInlineReminder]}>
          <Text style={[styles.cardKind, styles.cardKindInline]} numberOfLines={1}>
            {label}
          </Text>
          {time}
        </View>
      ) : (
        <>
          <Text style={styles.cardKind} numberOfLines={1}>
            {label}
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

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? '#FFFFFF' : '#111111';
  return StyleSheet.create({
    pressed: { opacity: 0.6 },
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
    more: { marginLeft: -4, marginRight: -6, paddingTop: 2 },
    note: { fontSize: 14, lineHeight: 19, color: ink, opacity: 0.8, marginTop: 6 },
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
