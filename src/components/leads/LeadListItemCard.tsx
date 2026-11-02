import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  radii,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@/theme';
import type { LeadListItem } from '@/types/api';
import { formatDate, formatRelative } from '@/utils/dates';
import { formatPhoneDisplay } from '@/utils/phone';

type Props = {
  lead: LeadListItem;
  /** Keep this stable (useCallback) — rows are memoized. */
  onPress: (lead: LeadListItem) => void;
};

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return null;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const h = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Mix `hex` toward `target` by `amount` (0–1). */
function mix(hex: string, target: { r: number; g: number; b: number }, amount: number): string {
  const rgb = parseRgb(hex);
  if (!rgb) return hex;
  return toHex(
    rgb.r + (target.r - rgb.r) * amount,
    rgb.g + (target.g - rgb.g) * amount,
    rgb.b + (target.b - rgb.b) * amount
  );
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/**
 * Stage badge from status color variants:
 *   bg  = soft tint of the stage color
 *   text = stronger / readable variant of the same hue
 */
function stageBadgeStyle(statusColor: string, isDark: boolean) {
  if (!isDark) {
    return {
      backgroundColor: mix(statusColor, WHITE, 0.86),
      borderColor: mix(statusColor, WHITE, 0.72),
      color: mix(statusColor, BLACK, 0.12),
    };
  }

  return {
    backgroundColor: mix(statusColor, BLACK, 0.72),
    borderColor: mix(statusColor, BLACK, 0.5),
    color: mix(statusColor, WHITE, 0.38),
  };
}

export const LeadListItemCard = memo(function LeadListItemCard({
  lead,
  onPress,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const statusColor = lead.leadStatus?.color || colors.brand;
  const badge = useMemo(
    () => stageBadgeStyle(statusColor, isDark),
    [statusColor, isDark]
  );

  return (
    <Pressable
      onPress={() => onPress(lead)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.phone}>{formatPhoneDisplay(phone)}</Text>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badge.backgroundColor,
              borderColor: badge.borderColor,
            },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: badge.color }]}
            numberOfLines={1}
          >
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
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
      borderWidth: StyleSheet.hairlineWidth,
    },
    badgeText: { ...typography.caption, fontWeight: '700' },
    meta: { gap: 2 },
    metaText: { ...typography.caption, color: colors.textMuted },
  });
}
