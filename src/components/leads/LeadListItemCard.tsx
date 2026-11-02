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

/** Append 8-bit alpha to a #RGB / #RRGGBB color. */
function withAlpha(hex: string, alphaHex: string): string {
  const raw = hex.trim().replace('#', '');
  if (raw.length === 3) {
    const full = raw
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${full}${alphaHex}`;
  }
  if (raw.length === 6) return `#${raw}${alphaHex}`;
  return hex;
}

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

/** Relative luminance 0–1 (sRGB). */
function luminance(hex: string): number {
  const rgb = parseRgb(hex);
  if (!rgb) return 0.5;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

/** Mix toward white so stage colors stay readable on #121212. */
function lightenForDark(hex: string, amount = 0.42): string {
  const rgb = parseRgb(hex);
  if (!rgb) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const toHex = (c: number) => mix(c).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function stageBadgeStyle(statusColor: string, isDark: boolean) {
  if (!isDark) {
    return {
      backgroundColor: withAlpha(statusColor, '22'),
      borderColor: withAlpha(statusColor, '00'),
      color: statusColor,
    };
  }

  const fg =
    luminance(statusColor) < 0.45 ? lightenForDark(statusColor) : statusColor;

  return {
    backgroundColor: withAlpha(statusColor, '38'),
    borderColor: withAlpha(fg, '55'),
    color: fg,
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
