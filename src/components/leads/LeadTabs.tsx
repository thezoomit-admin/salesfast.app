import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LeadListTab } from '@/features/leads/leadsApi';
import {
  type InboxPalette,
  inboxPalette,
} from '@/features/notifications/inboxPalette';
import { radii, useTheme } from '@/theme';

export type LeadTabItem = {
  key: LeadListTab;
  label: string;
  /** Hidden until known, and while it is zero (as on the Notifications pills). */
  count?: number;
};

type Props = {
  tabs: LeadTabItem[];
  active: LeadListTab;
  onChange: (tab: LeadListTab) => void;
  /** Finger down: lets the screen start the tab's request ahead of the tap. */
  onPressIn?: (tab: LeadListTab) => void;
};

/**
 * The Notifications pill track, made scrollable: Leads has a tab per status,
 * too many to share one row. Picking a tab slides it to the middle so its
 * neighbours come into view.
 */
function LeadTabsBase({ tabs, active, onChange, onPressIn }: Props) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const layouts = useRef(new Map<string, { x: number; width: number }>());
  const row = useRef({ viewport: 0, content: 0 });
  // A tab opened from Home can be set before its pill has been measured.
  const activeRef = useRef(active);

  const center = useCallback((t: LeadListTab) => {
    const item = layouts.current.get(String(t));
    const { viewport, content } = row.current;
    if (!item || !viewport) return;
    const max = Math.max(0, content - viewport);
    const x = Math.min(max, Math.max(0, item.x + item.width / 2 - viewport / 2));
    scrollRef.current?.scrollTo({ x, animated: true });
  }, []);

  useEffect(() => {
    activeRef.current = active;
    center(active);
  }, [active, center]);

  const onTabLayout = useCallback(
    (t: LeadListTab) => (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      layouts.current.set(String(t), { x, width });
      if (t === activeRef.current) center(t);
    },
    [center]
  );

  return (
    <View style={styles.track}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        onLayout={(e) => {
          row.current.viewport = e.nativeEvent.layout.width;
          center(activeRef.current);
        }}
        onContentSizeChange={(w) => {
          row.current.content = w;
          center(activeRef.current);
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.key === active;
          const count = tab.count;
          return (
            <Pressable
              key={String(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={
                count ? `${tab.label}, ${count} leads` : tab.label
              }
              onPress={() => onChange(tab.key)}
              onPressIn={onPressIn ? () => onPressIn(tab.key) : undefined}
              onLayout={onTabLayout(tab.key)}
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
                    {count > 999 ? '999+' : count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const LeadTabs = memo(LeadTabsBase);

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    track: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: palette.trackBorder,
      backgroundColor: palette.track,
      // Pills scroll out under the rounded ends instead of past them.
      overflow: 'hidden',
    },
    scroll: { flexGrow: 0 },
    content: {
      alignItems: 'center',
      gap: 6,
      padding: 5,
    },
    tab: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 31,
      minWidth: 64,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      backgroundColor: palette.pill,
    },
    tabActive: { backgroundColor: palette.accent },
    pressed: { opacity: 0.7 },
    label: {
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
  });
}
