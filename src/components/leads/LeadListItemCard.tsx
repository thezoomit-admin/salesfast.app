import Ionicons from "@expo/vector-icons/Ionicons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { memo, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ArrowDownDoubleIcon,
  CallIcon,
  FlameIcon,
  MinusSignIcon,
} from "@/components/icons/hugeicons";
import {
  PRIORITY_META,
  priorityBadgeColors,
} from "@/features/leads/leadPriority";
import { typography, useTheme, type ThemeColors } from "@/theme";
import type { LeadListItem } from "@/types/api";
import { followupWhenLabel } from "@/utils/dates";
import { openPhoneDialer, openWhatsApp } from "@/utils/phone";

type Props = {
  lead: LeadListItem;
  /** Keep this stable (useCallback) — rows are memoized. */
  onPress: (lead: LeadListItem) => void;
  /** Touch down — e.g. start loading the detail. Keep stable too. */
  onPressIn?: (lead: LeadListItem) => void;
  /** Priority chip tap. Keep stable too. */
  onPriorityPress?: (lead: LeadListItem) => void;
  /** History button tap. Keep stable too. */
  onHistoryPress?: (lead: LeadListItem) => void;
};

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

/** Same layout as the home "Latest leads" card. */
export const LeadListItemCard = memo(function LeadListItemCard({
  lead,
  onPress,
  onPressIn,
  onPriorityPress,
  onHistoryPress,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === "dark";
  const styles = useMemo(() => createStyles(colors), [colors]);
  const name = lead.buyerPersona?.fullName || "Unnamed lead";
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const statusName = lead.leadStatus?.name || "Lead";
  const statusColor = lead.leadStatus?.color || colors.brand;
  const priority = lead.priority ?? null;
  const priorityMeta = priority ? PRIORITY_META[priority] : null;
  const priorityBadge = useMemo(
    () => (priority ? priorityBadgeColors(priority, isDark) : null),
    [priority, isDark],
  );
  const subtitle = [lead.leadSource?.name, lead.assignedToName]
    .filter(Boolean)
    .join(" · ");
  const when = followupWhenLabel(lead.nextFollowupDate, lead.updatedAt);
  // Only an explicit false — old servers don't send the flag.
  const unread = lead.viewed === false;

  const open = () => onPress(lead);
  const pressIn = onPressIn ? () => onPressIn(lead) : undefined;

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
    <View style={[styles.card, unread && styles.cardUnread]}>
      {/* Unread (nobody has opened it) stands out like an unread notification. */}
      {unread ? <View style={styles.unreadBar} /> : null}
      <View style={styles.cardBody}>
        <View style={styles.nameRow}>
          <Pressable
            onPress={open}
            onPressIn={pressIn}
            accessibilityLabel={unread ? `${name}, unread` : undefined}
            style={({ pressed }) => [
              styles.nameTap,
              unread && styles.nameTapUnread,
              pressed && styles.pressed,
            ]}
          >
            {unread ? <View style={styles.unreadDot} /> : null}
            <Text
              style={[styles.name, unread && styles.nameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change priority"
            disabled={!onPriorityPress}
            hitSlop={4}
            onPress={() => onPriorityPress?.(lead)}
            style={[
              styles.priorityChip,
              priorityBadge
                ? {
                    backgroundColor: priorityBadge.backgroundColor,
                    borderColor: priorityBadge.borderColor,
                  }
                : {
                    backgroundColor: colors.surfaceMuted,
                    borderColor: colors.border,
                  },
            ]}
          >
            {priority && priorityBadge ? (
              <HugeiconsIcon
                icon={PRIORITY_ICON[priority]}
                size={12}
                color={priorityBadge.color}
                strokeWidth={1.5}
              />
            ) : null}
            <Text
              style={[
                styles.priorityText,
                { color: priorityBadge?.color ?? colors.textMuted },
              ]}
            >
              {priorityMeta?.label ?? "Priority"}
            </Text>
            {onPriorityPress ? (
              <Ionicons
                name="chevron-down"
                size={12}
                color={priorityBadge?.color ?? colors.textMuted}
              />
            ) : null}
          </Pressable>
        </View>

        <Pressable
          onPress={open}
          onPressIn={pressIn}
          style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
        >
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.ribbonWrap}>
              <View style={[styles.ribbon, { backgroundColor: statusColor }]}>
                <Text style={styles.ribbonText} numberOfLines={1}>
                  {statusName}
                </Text>
              </View>
              <View
                style={[styles.ribbonTip, { borderLeftColor: statusColor }]}
              />
            </View>
            <Text
              style={[
                styles.when,
                when.startsWith("Overdue") && { color: colors.danger },
              ]}
              numberOfLines={1}
            >
              {when}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.cardFooter}>
        {onHistoryPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open lead history"
            hitSlop={6}
            onPress={() => onHistoryPress(lead)}
            style={({ pressed }) => [
              styles.historyBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.historyText}>History</Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : (
          <View />
        )}

        <View style={styles.actionBtns}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call lead"
            disabled={!phone}
            hitSlop={8}
            onPress={() => void onCall()}
            style={({ pressed }) => [(!phone || pressed) && styles.pressed]}
          >
            <HugeiconsIcon
              icon={CallIcon}
              size={20}
              color={phone ? colors.textSecondary : colors.textMuted}
              strokeWidth={2}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="WhatsApp lead"
            disabled={!whatsapp}
            hitSlop={8}
            onPress={() => void onWhatsApp()}
            style={({ pressed }) => [(!whatsapp || pressed) && styles.pressed]}
          >
            <Ionicons
              name="logo-whatsapp"
              size={20}
              color={whatsapp ? "#25D366" : colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.9 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardUnread: {
      // ~6% brand tint over the surface, readable in light and dark.
      backgroundColor: `${colors.brand}10`,
      borderColor: `${colors.brand}55`,
    },
    unreadBar: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: colors.brand,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brand,
      flexShrink: 0,
    },
    cardBody: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    cardMain: {
      gap: 8,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    nameTap: {
      flex: 1,
      minWidth: 0,
    },
    nameTapUnread: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    nameUnread: {
      flexShrink: 1,
      fontWeight: "800",
    },
    priorityChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      flexShrink: 0,
    },
    priorityText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: "700",
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: -2,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginTop: 2,
    },
    ribbonWrap: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      maxWidth: "62%",
    },
    ribbon: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
      maxWidth: "100%",
    },
    ribbonText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    ribbonTip: {
      width: 0,
      height: 0,
      borderTopWidth: 12,
      borderBottomWidth: 12,
      borderLeftWidth: 9,
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    when: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      flexShrink: 0,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 12,
    },
    historyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    historyText: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    actionBtns: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flexShrink: 0,
    },
  });
}
