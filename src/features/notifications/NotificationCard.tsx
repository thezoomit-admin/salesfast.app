import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Calendar03Icon } from '@/components/icons/hugeicons';
import { useTheme } from '@/theme';
import { formatClockTime, formatDueDay, formatDueIn } from '@/utils/dates';

import {
  type InboxPalette,
  inboxPalette,
  type InboxTone,
} from './inboxPalette';
import type { AppNotification } from './notificationsApi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Kind = { icon: IconName; tone: InboxTone; chip: string; chipTone?: InboxTone };

const FOLLOW_UP: Kind = { icon: 'people', tone: 'blue', chip: 'Follow-up' };

/** What the follow-up is meant to be, from the alert's `followUpType`. */
const FOLLOW_UP_KIND: Record<string, Kind> = {
  FOLLOWUP: FOLLOW_UP,
  COLD_CALL: { icon: 'call', tone: 'sky', chip: 'Cold Call' },
  SITE_VISIT: { icon: 'location', tone: 'purple', chip: 'Site Visit' },
  OFFICE_VISIT: { icon: 'business', tone: 'blue', chip: 'Visit' },
};

const LEAD: Kind = { icon: 'person', tone: 'purple', chip: 'Lead', chipTone: 'blue' };

const KIND: Record<string, Kind> = {
  LEAD_ASSIGNED: LEAD,
  LEAD_ASSIGNMENT_ACTIVITY: LEAD,
  LEAD_REASSIGNED_AWAY: LEAD,
  LEAD_UNASSIGNED: { icon: 'person', tone: 'red', chip: 'Lead' },
  PROPOSAL_RESPONSE_REMINDER: { icon: 'document-text', tone: 'blue', chip: 'Proposal' },
  CONTRACT_EXPIRY: { icon: 'document-text', tone: 'red', chip: 'Contract' },
  WEBSITE_LEAD: { icon: 'globe', tone: 'blue', chip: 'Website' },
  FACEBOOK_LEAD: { icon: 'logo-facebook', tone: 'blue', chip: 'Facebook' },
  FACEBOOK_CSV_IMPORT_LEAD: { icon: 'logo-facebook', tone: 'blue', chip: 'Facebook' },
  WHATSAPP_LEAD: { icon: 'logo-whatsapp', tone: 'green', chip: 'WhatsApp' },
};

const FALLBACK: Kind = { icon: 'notifications', tone: 'blue', chip: 'Info' };

const FOLLOW_UP_ALERTS = new Set([
  'FOLLOW_UP_WARN_15',
  'FOLLOW_UP_WARN_5',
  'FOLLOW_UP_DUE_SOON',
  'FOLLOW_UP_REMINDER',
  'FOLLOW_UP_OVERDUE',
]);

/** Their title names the lead, so the date line says all that's left. */
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

function kindOf(item: AppNotification): Kind {
  const crmType = item.metadata?.crmType ?? '';
  if (!FOLLOW_UP_ALERTS.has(crmType)) return KIND[crmType] ?? FALLBACK;

  const followUpType = item.metadata?.followUpType ?? '';
  const kind = FOLLOW_UP_KIND[followUpType] ?? FOLLOW_UP;
  const coldCall = followUpType === 'COLD_CALL';
  if (item.resolution === 'COMPLETED') {
    return {
      icon: 'checkmark-circle',
      tone: 'green',
      chip: coldCall ? 'Call' : kind.chip,
    };
  }
  return coldCall && !item.isRead ? { ...kind, tone: 'red' } : kind;
}

type Props = {
  item: AppNotification;
  /** Current time, so remaining minutes stay right while the list is open. */
  now: number;
  /** Tapping opens something, so the row gets a chevron. */
  linked: boolean;
  onPress: (item: AppNotification) => void;
  onLongPress: (item: AppNotification) => void;
};

/** Inbox card — tinted icon | title + date | type chip, unread dot, chevron. */
export const NotificationCard = memo(function NotificationCard({
  item,
  now,
  linked,
  onPress,
  onLongPress,
}: Props) {
  const { resolved: scheme } = useTheme();
  const palette = inboxPalette(scheme === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  const crmType = item.metadata?.crmType ?? '';
  const kind = kindOf(item);
  const tint = palette.tones[kind.tone];
  const chip = palette.tones[kind.chipTone ?? kind.tone];

  const resolved = !!item.resolvedAt;
  const unread = !item.isRead && !resolved;
  const dueAt = SHOWS_DUE_DATE.has(crmType) ? item.metadata?.dueAt : undefined;
  const at = dueAt ?? item.createdAt;
  const when = `${formatDueIn(dueAt, now) ?? formatDueDay(at)}  •  ${formatClockTime(at)}`;
  const completed = item.resolution === 'COMPLETED';
  const outcome = resolved
    ? (RESOLUTION_LABEL[item.resolution ?? ''] ?? item.message)
    : null;
  // A completed row's green tick already says what its label would.
  const note = completed ? null : (outcome ?? (dueAt ? null : item.message));

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      accessibilityRole="button"
      accessibilityLabel={[item.title, outcome ?? note, when]
        .filter(Boolean)
        .join('. ')}
      accessibilityHint="Long press to dismiss"
      accessibilityState={{ selected: unread }}
      style={({ pressed }) => [
        styles.card,
        resolved && !completed && styles.resolved,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
        <Ionicons name={kind.icon} size={24} color={tint.fg} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.chip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.chipText, { color: chip.fg }]} numberOfLines={1}>
              {kind.chip}
            </Text>
          </View>
          <View style={styles.dotSlot}>
            {unread ? <View style={styles.dot} /> : null}
          </View>
        </View>

        {note ? (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        ) : null}

        <View style={styles.whenRow}>
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={13}
            color={palette.inkSoft}
            strokeWidth={1.6}
          />
          <Text style={styles.when} numberOfLines={1}>
            {when}
          </Text>
        </View>
      </View>

      <View style={styles.chevronSlot}>
        {linked ? (
          <Ionicons name="chevron-forward" size={16} color={palette.inkSoft} />
        ) : null}
      </View>
    </Pressable>
  );
});

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 53,
      paddingVertical: 5,
      paddingLeft: 12,
      paddingRight: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
      boxShadow: '0 2px 6px rgba(40, 60, 140, 0.05)',
    },
    resolved: { opacity: 0.6 },
    pressed: { opacity: 0.7 },
    iconWrap: {
      width: 41,
      height: 41,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '700',
      color: palette.ink,
      marginRight: 4,
    },
    chip: {
      height: 20,
      paddingHorizontal: 8,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '600',
    },
    dotSlot: {
      width: 13,
      alignSelf: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 2,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: palette.alert,
    },
    note: {
      fontSize: 11,
      lineHeight: 15,
      color: palette.inkSoft,
    },
    whenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    when: {
      flexShrink: 1,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '500',
      color: palette.inkSoft,
    },
    chevronSlot: {
      width: 18,
      alignItems: 'flex-end',
    },
  });
}
