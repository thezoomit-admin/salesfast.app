import { Fragment, type ReactNode, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CountTabDivider } from '@/components/ui/CountTab';
import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

import type { NotificationTab } from './notificationsApi';

type Props = {
  tabs: { key: NotificationTab; label: string }[];
  /** A badge shows only while a tab has unread items. */
  unread?: Record<NotificationTab, number>;
  active: NotificationTab;
  onChange: (tab: NotificationTab) => void;
  /** Sits at the far end of the row. */
  right?: ReactNode;
};

/** Underlined tab row on a full-width rule, unread badge beside the label. */
export function NotificationTabs({
  tabs,
  unread,
  active,
  onChange,
  right,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {/* Scrolls so every tab stays reachable on narrow phones. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={styles.scroll}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const count = unread?.[tab.key];
          return (
            <Fragment key={tab.key}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={
                  count ? `${tab.label}, ${count} unread` : tab.label
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
                {count ? (
                  <View style={[styles.badge, selected && styles.badgeActive]}>
                    <Text
                      style={[
                        styles.badgeText,
                        selected && styles.badgeTextActive,
                      ]}
                    >
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                ) : null}
                {selected ? <View style={styles.underline} /> : null}
              </Pressable>
              {tab.key === 'all' ? (
                <View style={styles.divider}>
                  <CountTabDivider />
                </View>
              ) : null}
            </Fragment>
          );
        })}
      </ScrollView>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    scroll: { flex: 1 },
    tabs: {
      flexDirection: 'row',
      gap: 18,
      paddingHorizontal: spacing.lg,
    },
    divider: { justifyContent: 'center' },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
    },
    pressed: { opacity: 0.7 },
    right: {
      justifyContent: 'center',
      paddingLeft: spacing.sm,
      paddingRight: spacing.lg,
    },
    label: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    labelActive: {
      fontWeight: '600',
      color: colors.brand,
    },
    badge: {
      minWidth: 20,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    badgeActive: {
      backgroundColor: colors.brand,
    },
    badgeText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    badgeTextActive: {
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
