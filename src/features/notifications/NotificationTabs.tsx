import { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, useTheme } from '@/theme';

import { type InboxPalette, inboxPalette } from './inboxPalette';
import type { NotificationTab } from './notificationsApi';

type Props = {
  tabs: { key: NotificationTab; label: string }[];
  /** A count shows only while a tab has unread items. */
  unread?: Record<NotificationTab, number>;
  active: NotificationTab;
  onChange: (tab: NotificationTab) => void;
  /** Sits past the divider at the far end of the track. */
  right?: ReactNode;
};

/** Pill tabs on a rounded track, unread count beside the label. */
export function NotificationTabs({
  tabs,
  unread,
  active,
  onChange,
  right,
}: Props) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const count = unread?.[tab.key];
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={
              count ? `${tab.label}, ${count} unread` : tab.label
            }
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.label, selected && styles.labelActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {count ? (
              <View style={[styles.count, selected && styles.countActive]}>
                <Text style={styles.countText}>
                  {count > 99 ? '99+' : count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      {right ? (
        <>
          <View style={styles.divider} />
          <View style={styles.right}>{right}</View>
        </>
      ) : null}
    </View>
  );
}

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      padding: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: palette.trackBorder,
      backgroundColor: palette.track,
    },
    tab: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 32,
      paddingHorizontal: 6,
      borderRadius: radii.pill,
      backgroundColor: palette.pill,
    },
    tabActive: { backgroundColor: palette.accent },
    pressed: { opacity: 0.7 },
    label: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: palette.ink,
    },
    labelActive: { color: palette.onAccent },
    count: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 4,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.count,
    },
    countActive: { backgroundColor: palette.onAccent },
    countText: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '700',
      color: palette.accent,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 22,
      marginLeft: 12,
      backgroundColor: palette.rule,
    },
    right: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
