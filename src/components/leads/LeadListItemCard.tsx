import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';
import type { LeadListItem } from '@/types/api';
import { formatDate, formatRelative } from '@/utils/dates';
import { formatPhoneDisplay } from '@/utils/phone';

type Props = {
  lead: LeadListItem;
  onPress: () => void;
};

export function LeadListItemCard({ lead, onPress }: Props) {
  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const statusColor = lead.leadStatus?.color || colors.brand;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.phone}>{formatPhoneDisplay(phone)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}22` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]} numberOfLines={1}>
            {lead.leadStatus?.name || 'No status'}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaText} numberOfLines={1}>
          {lead.assignedToName || 'Unassigned'}
          {lead.leadSource?.name ? ` · ${lead.leadSource.name}` : ''}
        </Text>
        <Text style={styles.metaText}>
          {lead.nextFollowupDate
            ? `Follow-up ${formatDate(lead.nextFollowupDate)}`
            : lead.updatedAt
              ? formatRelative(lead.updatedAt)
              : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.92 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  main: { flex: 1, gap: 2 },
  name: { ...typography.subtitle, color: colors.text },
  phone: { ...typography.body, color: colors.textSecondary },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: 120,
  },
  badgeText: { ...typography.caption, fontWeight: '700' },
  meta: { gap: 2 },
  metaText: { ...typography.caption, color: colors.textMuted },
});
