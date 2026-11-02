import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  radii,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from "@/theme";
import type { LeadListItem, LeadPriority } from "@/types/api";
import { formatDate, formatRelative } from "@/utils/dates";
import {
  formatPhoneDisplay,
  openPhoneDialer,
  openWhatsApp,
} from "@/utils/phone";

type Props = {
  lead: LeadListItem;
  /** Keep this stable (useCallback) — rows are memoized. */
  onPress: (lead: LeadListItem) => void;
};

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
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
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(
  hex: string,
  target: { r: number; g: number; b: number },
  amount: number,
): string {
  const rgb = parseRgb(hex);
  if (!rgb) return hex;
  return toHex(
    rgb.r + (target.r - rgb.r) * amount,
    rgb.g + (target.g - rgb.g) * amount,
    rgb.b + (target.b - rgb.b) * amount,
  );
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

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

const PRIORITY_META: Record<LeadPriority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "#0ba5ec" },
  MEDIUM: { label: "Medium", color: "#d97706" },
  HIGH: { label: "High", color: "#f04438" },
};

function priorityBadgeStyle(priority: LeadPriority, isDark: boolean) {
  const base = PRIORITY_META[priority].color;
  return stageBadgeStyle(base, isDark);
}

export const LeadListItemCard = memo(function LeadListItemCard({
  lead,
  onPress,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === "dark";
  const styles = useMemo(() => createStyles(colors), [colors]);
  const name = lead.buyerPersona?.fullName || "Unnamed lead";
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const statusColor = lead.leadStatus?.color || colors.brand;
  const stageBadge = useMemo(
    () => stageBadgeStyle(statusColor, isDark),
    [statusColor, isDark],
  );
  const priority = lead.priority ?? null;
  const priorityMeta = priority ? PRIORITY_META[priority] : null;
  const priorityBadge = useMemo(
    () => (priority ? priorityBadgeStyle(priority, isDark) : null),
    [priority, isDark],
  );

  const metaBits = [
    lead.leadSource?.name,
    lead.nextFollowupDate
      ? `Follow-up ${formatDate(lead.nextFollowupDate)}`
      : lead.updatedAt
        ? formatRelative(lead.updatedAt)
        : null,
  ].filter(Boolean);

  async function onCall() {
    const ok = await openPhoneDialer(phone);
    if (!ok) Alert.alert("Unable to dial", "No phone number available.");
  }

  async function onWhatsApp() {
    try {
      const ok = await openWhatsApp(whatsapp);
      if (!ok) Alert.alert("Unable to open WhatsApp", "No number available.");
    } catch {
      Alert.alert("Unable to open WhatsApp");
    }
  }

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
              backgroundColor: stageBadge.backgroundColor,
              borderColor: stageBadge.borderColor,
            },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: stageBadge.color }]}
            numberOfLines={1}
          >
            {lead.leadStatus?.name || "No status"}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerMeta}>
          {priorityMeta && priorityBadge ? (
            <View
              style={[
                styles.priorityBadge,
                {
                  backgroundColor: priorityBadge.backgroundColor,
                  borderColor: priorityBadge.borderColor,
                },
              ]}
            >
              <Text
                style={[styles.badgeText, { color: priorityBadge.color }]}
                numberOfLines={1}
              >
                {priorityMeta.label}
              </Text>
            </View>
          ) : null}
          {metaBits.length > 0 ? (
            <Text style={styles.metaText} numberOfLines={1}>
              {metaBits.join(" · ")}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call"
            hitSlop={8}
            disabled={!phone}
            onPress={(e) => {
              e.stopPropagation?.();
              void onCall();
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              (pressed || !phone) && styles.actionFaded,
            ]}
          >
            <Ionicons
              name="call-outline"
              size={20}
              color={phone ? colors.textSecondary : colors.textMuted}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="WhatsApp"
            hitSlop={8}
            disabled={!whatsapp}
            onPress={(e) => {
              e.stopPropagation?.();
              void onWhatsApp();
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              (pressed || !whatsapp) && styles.actionFaded,
            ]}
          >
            <Ionicons
              name="logo-whatsapp"
              size={20}
              color={whatsapp ? "#25D366" : colors.textMuted}
            />
          </Pressable>
        </View>
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
    row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
    main: { flex: 1, gap: 2, minWidth: 0 },
    name: { ...typography.subtitle, color: colors.text },
    phone: { ...typography.body, color: colors.textSecondary },
    badge: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      maxWidth: 120,
      borderWidth: StyleSheet.hairlineWidth,
    },
    priorityBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderWidth: StyleSheet.hairlineWidth,
      flexShrink: 0,
    },
    badgeText: { ...typography.caption, fontWeight: "700" },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: 2,
    },
    footerMeta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minWidth: 0,
    },
    metaText: {
      ...typography.caption,
      color: colors.textMuted,
      flexShrink: 1,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    },
    actionBtn: {
      width: 28,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    actionFaded: { opacity: 0.45 },
  });
}
