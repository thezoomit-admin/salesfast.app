import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Calendar03Icon, Clock01Icon } from '@/components/icons/hugeicons';
import {
  cardShadow,
  leadDetailPalette,
  type LeadDetailPalette,
} from '@/components/leads/leadDetailPalette';
import { resolveLastContactAt } from '@/features/leads/leadActivity';
import { radii, spacing, useTheme, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';
import {
  formatCalendarDate,
  formatClockTime,
  parseDate,
} from '@/utils/dates';

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

function pillColors(
  tone: Tone,
  colors: ThemeColors,
  palette: LeadDetailPalette,
  isDark: boolean
) {
  if (tone === 'overdue') {
    return {
      bg: isDark ? colors.dangerSoft : '#FDE7EA',
      fg: isDark ? colors.danger : '#D92D3F',
    };
  }
  if (tone === 'dueToday') {
    return { bg: colors.warningSoft, fg: isDark ? colors.warning : '#B54708' };
  }
  if (tone === 'upcoming') {
    return { bg: colors.primary50, fg: colors.brand };
  }
  return { bg: palette.tint, fg: palette.muted };
}

function resolveFollowup(lead: LeadDetail) {
  const timed = lead.pendingFollowUp?.type ? lead.pendingFollowUp : null;
  const dueRaw = timed?.dueAt ?? lead.nextFollowupDate ?? null;
  const due = parseDate(dueRaw);
  if (!due) {
    return {
      empty: true as const,
      tone: 'empty' as Tone,
      dateLabel: 'Not scheduled',
      detail: 'Tap to schedule',
      statusLabel: 'Not set',
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
    statusLabel = days === 1 ? '1 day overdue' : `${days} days overdue`;
  } else if (dayDiff === 0) {
    tone = 'dueToday';
    statusLabel = 'Due today';
  } else if (dayDiff === 1) {
    statusLabel = 'Due tomorrow';
  } else {
    statusLabel = `Due in ${dayDiff} days`;
  }

  // Timed follow-ups (visit, call…) also carry a kind and a clock time.
  const detail = timed
    ? [followupTypeLabel(timed.type), formatClockTime(due)]
        .filter(Boolean)
        .join(' · ')
    : null;

  return {
    empty: false as const,
    tone,
    dateLabel: formatCalendarDate(due),
    detail,
    statusLabel,
  };
}

export function LeadFollowupCard({ lead, onPress }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = useMemo(
    () => leadDetailPalette(colors, isDark),
    [colors, isDark]
  );
  const styles = useMemo(
    () => createStyles(palette, isDark),
    [palette, isDark]
  );
  const info = useMemo(() => resolveFollowup(lead), [lead]);
  const pill = pillColors(info.tone, colors, palette, isDark);
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
          : `Next follow-up ${info.dateLabel}, ${info.statusLabel}`
      }
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={24}
            color={info.empty ? palette.muted : colors.brand}
            strokeWidth={1.8}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Next Follow-up</Text>
          <Text
            style={[styles.date, info.empty && styles.dateEmpty]}
            numberOfLines={1}
          >
            {info.dateLabel}
          </Text>
          {info.detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {info.detail}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
          <HugeiconsIcon
            icon={Clock01Icon}
            size={15}
            color={pill.fg}
            strokeWidth={1.9}
          />
          <Text
            style={[styles.statusText, { color: pill.fg }]}
            numberOfLines={1}
          >
            {info.statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <HugeiconsIcon
          icon={Clock01Icon}
          size={18}
          color={colors.brand}
          strokeWidth={1.7}
        />
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

function createStyles(palette: LeadDetailPalette, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      ...cardShadow(isDark),
    },
    pressed: { opacity: 0.88 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minWidth: 0,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backgroundColor: palette.soft,
    },
    headerText: { flex: 1, minWidth: 0 },
    title: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600',
      color: palette.ink,
    },
    date: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '700',
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    dateEmpty: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.muted,
    },
    detail: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      color: palette.body,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 0,
      maxWidth: '48%',
    },
    statusText: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '600',
      flexShrink: 1,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.divider,
      marginVertical: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    rowLabel: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.muted,
      flex: 1,
    },
    rowValue: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
      color: palette.ink,
      flexShrink: 1,
      textAlign: 'right',
      fontVariant: ['tabular-nums'],
    },
    rowMuted: { color: palette.muted, fontWeight: '400', fontSize: 14 },
  });
}
