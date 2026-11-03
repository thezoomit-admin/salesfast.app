import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Calendar03Icon } from '@/components/icons/hugeicons';
import { resolveLastContactAt } from '@/features/leads/leadActivity';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';
import { formatCalendarDate, formatDateTime, parseDate } from '@/utils/dates';

type Tone = 'upcoming' | 'dueToday' | 'overdue' | 'empty';

type Props = {
  lead: LeadDetail;
  /** Opens Add Note so the agent can schedule / update follow-up. */
  onPress?: () => void;
};

const FOLLOWUP_TYPE_LABEL: Record<string, string> = {
  OFFICE_VISIT: 'Office visit',
  SITE_VISIT: 'Site visit',
  FOLLOW_UP: 'Follow-up',
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
};

function followupTypeLabel(type?: string | null) {
  if (!type) return null;
  return FOLLOWUP_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toneColors(tone: Tone, colors: ThemeColors) {
  if (tone === 'overdue') {
    return {
      chipBg: colors.dangerSoft,
      chipFg: colors.danger,
      iconBg: colors.dangerSoft,
      iconFg: colors.danger,
    };
  }
  if (tone === 'dueToday') {
    return {
      chipBg: colors.warningSoft,
      chipFg: colors.warning,
      iconBg: colors.warningSoft,
      iconFg: colors.warning,
    };
  }
  if (tone === 'upcoming') {
    return {
      chipBg: colors.primary50,
      chipFg: colors.brand,
      iconBg: colors.primary50,
      iconFg: colors.brand,
    };
  }
  return {
    chipBg: colors.surfaceMuted,
    chipFg: colors.textMuted,
    iconBg: colors.surfaceMuted,
    iconFg: colors.textMuted,
  };
}

function resolveFollowup(lead: LeadDetail) {
  const timed = lead.pendingFollowUp?.type ? lead.pendingFollowUp : null;
  const dueRaw = timed?.dueAt ?? lead.nextFollowupDate ?? null;
  const due = parseDate(dueRaw);
  if (!due) {
    return {
      empty: true as const,
      tone: 'empty' as Tone,
      subtitle: 'Tap to schedule',
      statusLabel: 'Not set',
      dueRaw: null as string | null,
    };
  }

  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const dayDiff = Math.round(
    (dueDay.getTime() - today.getTime()) / 86_400_000
  );

  let tone: Tone = 'upcoming';
  let statusLabel: string;
  if (dayDiff < 0) {
    tone = 'overdue';
    const days = Math.abs(dayDiff);
    statusLabel =
      days === 1 ? '1 day overdue' : `${days} days overdue`;
  } else if (dayDiff === 0) {
    tone = 'dueToday';
    statusLabel = timed
      ? `Due today · ${formatDateTime(due).split(', ')[1] ?? 'today'}`
      : 'Due today';
  } else if (dayDiff === 1) {
    statusLabel = 'Due tomorrow';
  } else {
    statusLabel = `Due in ${dayDiff} days`;
  }

  const typeLabel = followupTypeLabel(timed?.type);
  const when = timed ? formatDateTime(due) : formatCalendarDate(due);
  const subtitle = [typeLabel, when].filter(Boolean).join(' · ');

  return {
    empty: false as const,
    tone,
    subtitle,
    statusLabel,
    dueRaw,
  };
}

export function LeadFollowupCard({ lead, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const info = useMemo(() => resolveFollowup(lead), [lead]);
  const tone = toneColors(info.tone, colors);
  const lastContactAt = useMemo(() => resolveLastContactAt(lead), [lead]);
  const lastContact = lastContactAt
    ? formatCalendarDate(lastContactAt)
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        info.empty
          ? 'Schedule next follow-up'
          : `Next follow-up ${info.subtitle}`
      }
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        info.empty && styles.cardEmpty,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={18}
            color={tone.iconFg}
            strokeWidth={1.8}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Next Follow-up</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {info.subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Status</Text>
        <View
          style={[styles.statusPill, { backgroundColor: tone.chipBg }]}
        >
          <Text style={[styles.statusText, { color: tone.chipFg }]}>
            {info.statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Last contact</Text>
        <Text
          style={[styles.rowValue, !lastContact && styles.rowMuted]}
          numberOfLines={1}
        >
          {lastContact ?? 'No contact yet'}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardEmpty: {
      borderStyle: 'dashed',
    },
    pressed: { opacity: 0.88 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minWidth: 0,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      ...typography.body,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      minWidth: 0,
    },
    rowLabel: {
      ...typography.caption,
      color: colors.textMuted,
      flexShrink: 0,
    },
    rowValue: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
      flexShrink: 1,
      textAlign: 'right',
    },
    rowMuted: { color: colors.textMuted, fontWeight: '400' },
    statusPill: {
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
      maxWidth: '70%',
    },
    statusText: {
      ...typography.caption,
      fontWeight: '700',
      fontSize: 12,
    },
  });
}
