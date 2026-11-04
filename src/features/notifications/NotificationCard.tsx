import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, useThemeColors, type ThemeColors } from '@/theme';
import { formatClockTime, formatDueDay, formatDueIn } from '@/utils/dates';

import type { AppNotification } from './notificationsApi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tone = 'brand' | 'warning' | 'danger' | 'success';

const KIND: Record<string, { icon: IconName; tone: Tone }> = {
  LEAD_ASSIGNED: { icon: 'person-add-outline', tone: 'brand' },
  LEAD_ASSIGNMENT_ACTIVITY: { icon: 'swap-horizontal-outline', tone: 'brand' },
  LEAD_REASSIGNED_AWAY: { icon: 'share-outline', tone: 'warning' },
  LEAD_UNASSIGNED: { icon: 'alert-circle-outline', tone: 'danger' },
  FOLLOW_UP_WARN_15: { icon: 'calendar-outline', tone: 'warning' },
  FOLLOW_UP_WARN_5: { icon: 'calendar-outline', tone: 'warning' },
  FOLLOW_UP_DUE_SOON: { icon: 'calendar-outline', tone: 'warning' },
  FOLLOW_UP_REMINDER: { icon: 'alarm-outline', tone: 'warning' },
  FOLLOW_UP_OVERDUE: { icon: 'calendar-outline', tone: 'danger' },
  PROPOSAL_RESPONSE_REMINDER: { icon: 'document-text-outline', tone: 'brand' },
  CONTRACT_EXPIRY: { icon: 'calendar-outline', tone: 'danger' },
  WEBSITE_LEAD: { icon: 'globe-outline', tone: 'brand' },
  FACEBOOK_LEAD: { icon: 'logo-facebook', tone: 'brand' },
  FACEBOOK_CSV_IMPORT_LEAD: { icon: 'logo-facebook', tone: 'brand' },
  WHATSAPP_LEAD: { icon: 'logo-whatsapp', tone: 'success' },
};

const FALLBACK = { icon: 'notifications-outline' as IconName, tone: 'brand' as Tone };

/** Their title names the lead, so the second line can be the due date. */
const SHOWS_DUE_DATE = new Set([
  'FOLLOW_UP_WARN_15',
  'FOLLOW_UP_WARN_5',
  'FOLLOW_UP_DUE_SOON',
  'FOLLOW_UP_OVERDUE',
]);

const RESOLUTION_LABEL: Record<string, string> = {
  COMPLETED: 'Follow-up completed',
  RESCHEDULED: 'Follow-up rescheduled',
  CANCELLED: 'Follow-up cancelled',
  SUPERSEDED: 'Replaced by a newer alert',
  REASSIGNED: 'Lead reassigned',
};

const toneColors = (colors: ThemeColors, tone: Tone) => {
  if (tone === 'warning') return { fg: colors.warning, bg: colors.warningSoft };
  if (tone === 'danger') return { fg: colors.danger, bg: colors.dangerSoft };
  if (tone === 'success') return { fg: colors.success, bg: colors.successSoft };
  return { fg: colors.brand, bg: colors.primary50 };
};

type Props = {
  item: AppNotification;
  /** Current time, so remaining minutes stay right while the list is open. */
  now: number;
  onPress: (item: AppNotification) => void;
  onLongPress: (item: AppNotification) => void;
};

/** Inbox row — tinted icon | title + one line | time + unread dot. */
export const NotificationCard = memo(function NotificationCard({
  item,
  now,
  onPress,
  onLongPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const crmType = item.metadata?.crmType ?? '';
  const kind = KIND[crmType] ?? FALLBACK;
  const tint = toneColors(colors, kind.tone);
  const unread = !item.isRead;

  const resolved = !!item.resolvedAt;
  const dueAt = SHOWS_DUE_DATE.has(crmType) ? item.metadata?.dueAt : undefined;
  const dueDay = formatDueIn(dueAt, now) ?? formatDueDay(dueAt);
  const subtitle = resolved
    ? (RESOLUTION_LABEL[item.resolution ?? ''] ?? item.message)
    : dueAt
      ? `${dueDay}  •  ${formatClockTime(dueAt)}`
      : item.message;

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${subtitle}`}
      accessibilityHint="Long press to dismiss"
      accessibilityState={{ selected: unread }}
      style={({ pressed }) => [
        styles.row,
        resolved && styles.resolved,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
        <Ionicons name={kind.icon} size={20} color={tint.fg} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.subtitle,
            crmType === 'FOLLOW_UP_OVERDUE' &&
              !resolved &&
              styles.subtitleOverdue,
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>

      <View style={styles.side}>
        <Text style={styles.time}>{formatClockTime(item.createdAt)}</Text>
        {unread && !resolved ? <View style={styles.unreadDot} /> : null}
      </View>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    resolved: { opacity: 0.6 },
    pressed: { opacity: 0.7 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
      minWidth: 0,
      paddingRight: spacing.sm,
    },
    title: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    subtitleOverdue: {
      color: colors.danger,
    },
    side: {
      alignSelf: 'stretch',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingTop: 2,
    },
    time: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '400',
      color: colors.textMuted,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.brand,
    },
  });
}
