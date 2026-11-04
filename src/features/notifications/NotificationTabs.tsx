import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import type { NotificationCategory } from './notificationsApi';

type Props = {
  tabs: { key: NotificationCategory; label: string }[];
  /** Tabs with no unread show no badge, so neither do unknown counts. */
  unread?: Record<NotificationCategory, number>;
  active: NotificationCategory;
  onChange: (tab: NotificationCategory) => void;
};

/** Underlined tab row on a full-width rule, unread badge beside the label. */
export function NotificationTabs({ tabs, unread, active, onChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const count = unread?.[tab.key] ?? 0;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              count > 0 ? `${tab.label}, ${count} unread` : tab.label
            }
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Text
              style={[styles.label, selected && styles.labelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {count > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            ) : null}
            {selected ? <View style={styles.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
    },
    pressed: { opacity: 0.7 },
    label: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    labelActive: {
      fontWeight: '600',
      color: colors.text,
    },
    badge: {
      minWidth: 20,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: colors.white,
    },
    underline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      borderRadius: 1,
      backgroundColor: colors.brand,
    },
  });
}
