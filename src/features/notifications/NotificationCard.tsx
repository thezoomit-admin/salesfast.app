import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';
import { formatDateTime } from '@/utils/dates';

import type { AppNotification } from './notificationsApi';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Solid circles + white glyphs — Hisab NotificationRow pattern. */
const KIND: Record<string, { icon: IconName; bg: string }> = {
  LEAD_ASSIGNED: { icon: 'person-add', bg: '#F2461C' },
  LEAD_ASSIGNMENT_ACTIVITY: { icon: 'swap-horizontal', bg: '#5DADE2' },
  LEAD_REASSIGNED_AWAY: { icon: 'share-outline', bg: '#F39C12' },
  LEAD_UNASSIGNED: { icon: 'alert-circle', bg: '#F04438' },
  FOLLOW_UP_REMINDER: { icon: 'time', bg: '#F79009' },
  PROPOSAL_RESPONSE_REMINDER: { icon: 'document-text', bg: '#5DADE2' },
  CONTRACT_EXPIRY: { icon: 'calendar', bg: '#F04438' },
  WEBSITE_LEAD: { icon: 'globe', bg: '#5DADE2' },
  FACEBOOK_LEAD: { icon: 'logo-facebook', bg: '#1877F2' },
  FACEBOOK_CSV_IMPORT_LEAD: { icon: 'logo-facebook', bg: '#1877F2' },
  WHATSAPP_LEAD: { icon: 'logo-whatsapp', bg: '#25D366' },
};

const FALLBACK = { icon: 'notifications' as IconName, bg: '#5DADE2' };

type Props = {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
};

/** Hisab list-row card — icon | title/body/time | unread dot. */
export const NotificationCard = memo(function NotificationCard({
  item,
  onPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const kind = KIND[item.metadata?.crmType ?? ''] ?? FALLBACK;
  const unread = !item.isRead;

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityState={{ selected: unread }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: kind.bg }]}>
        <Ionicons name={kind.icon} size={22} color={colors.white} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
      </View>

      {unread ? <View style={styles.unreadDot} /> : <View style={styles.unreadSpacer} />}
    </Pressable>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.9 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      marginTop: 2,
    },
    content: {
      flex: 1,
      minWidth: 0,
      paddingRight: spacing.sm,
    },
    title: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    body: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '400',
      color: colors.textSecondary,
      marginBottom: 6,
    },
    time: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
      color: colors.textMuted,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.brand,
      marginTop: 6,
    },
    unreadSpacer: {
      width: 10,
    },
  });
}
