import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { kindTones } from '@/components/followups/followUpCalendar';
import { useTheme, type ThemeColors } from '@/theme';
import { formatClockTime } from '@/utils/dates';

import type { ActivityKind, ActivityView } from './activityDisplay';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const ACTIVITY_ICON: Record<ActivityKind, IconName> = {
  call: 'call-outline',
  callMissed: 'call-outline',
  whatsapp: 'logo-whatsapp',
  inPerson: 'person-outline',
  followUp: 'calendar-outline',
  followUpDone: 'checkmark-done-outline',
  email: 'mail-outline',
  meeting: 'people-outline',
  lost: 'close-circle-outline',
  note: 'document-text-outline',
};

/** Same colour families as the follow-up cards and notification icons. */
export function activityAccent(
  kind: ActivityKind,
  colors: ThemeColors,
  isDark: boolean
) {
  const tones = kindTones(isDark);
  switch (kind) {
    case 'call':
    case 'email':
      return tones.reminder.accent;
    case 'whatsapp':
      return tones.todo.accent;
    case 'inPerson':
    case 'meeting':
      return tones.event.accent;
    case 'callMissed':
    case 'lost':
      return colors.danger;
    case 'followUp':
      return colors.warning;
    case 'followUpDone':
      return colors.success;
    default:
      return colors.brand;
  }
}

type Props = {
  leadId: number;
  leadName: string;
  addedByName: string | null;
  createdAt: string;
  view: ActivityView;
  /** The last row of a day has no rail running on to the next one. */
  last: boolean;
  /** Keep this stable (useCallback) — rows are memoized. */
  onOpen: (leadId: number) => void;
};

/** Timeline row — tinted icon on a rail | lead, note, badges | time. */
export const ActivityRow = memo(function ActivityRow({
  leadId,
  leadName,
  addedByName,
  createdAt,
  view,
  last,
  onOpen,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = activityAccent(view.kind, colors, isDark);
  const tint = `${accent}26`;
  const by = addedByName?.trim();

  return (
    <Pressable
      onPress={() => onOpen(leadId)}
      accessibilityRole="button"
      accessibilityLabel={[leadName, view.label, view.text]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rail}>
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <Ionicons name={ACTIVITY_ICON[view.kind]} size={18} color={accent} />
        </View>
        {last ? null : <View style={styles.railLine} />}
      </View>

      <View style={[styles.content, !last && styles.contentGap]}>
        <View style={styles.top}>
          <Text style={styles.lead} numberOfLines={1}>
            {leadName}
          </Text>
          <Text style={styles.time}>{formatClockTime(createdAt)}</Text>
        </View>

        {view.text ? (
          <Text style={styles.note} numberOfLines={3}>
            {view.text}
          </Text>
        ) : null}

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: tint }]}>
            <Text style={[styles.badgeText, { color: accent }]} numberOfLines={1}>
              {view.label}
            </Text>
          </View>
          {view.hasVoiceNote ? (
            <View style={[styles.badge, styles.voiceBadge]}>
              <Ionicons name="mic-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.badgeText, styles.voiceText]}>Voice note</Text>
            </View>
          ) : null}
          {by ? (
            <Text style={styles.by} numberOfLines={1}>
              by {by}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    pressed: { opacity: 0.6 },
    rail: { width: 36, alignItems: 'center' },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    railLine: {
      flex: 1,
      width: 2,
      borderRadius: 1,
      marginVertical: 4,
      backgroundColor: colors.border,
    },
    content: { flex: 1, minWidth: 0, gap: 6 },
    contentGap: { paddingBottom: 18 },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 20,
    },
    lead: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      color: colors.text,
    },
    time: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '400',
      color: colors.textMuted,
    },
    note: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    badges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '100%',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
    },
    badgeText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '600' },
    voiceBadge: { backgroundColor: colors.surfaceMuted },
    voiceText: { color: colors.textSecondary },
    by: {
      flexShrink: 1,
      marginLeft: 2,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
    },
  });
}
