import { type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radii, useTheme } from '@/theme';

import { type InboxPalette, inboxPalette } from './inboxPalette';

type Props<K extends string> = {
  tabs: { key: K; label: string }[];
  /** A count shows only while a tab has a non-zero number. */
  unread?: Partial<Record<K, number>>;
  /** Read out after the count, e.g. "Overdue, 3 unread". */
  countLabel?: string;
  active: K;
  onChange: (tab: K) => void;
  /** Sits past the divider at the far end of the track. */
  right?: ReactNode;
};

/**
 * Pill tabs on a rounded track, count beside the label. The inbox's design,
 * also used by Follow-ups so the two hero pages match.
 */
export function NotificationTabs<K extends string>({
  tabs,
  unread,
  countLabel = 'unread',
  active,
  onChange,
  right,
}: Props<K>) {
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
              count ? `${tab.label}, ${count} ${countLabel}` : tab.label
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
      padding: 5,
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
      height: 31,
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
