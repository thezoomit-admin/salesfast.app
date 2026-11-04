import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { CountTab } from '@/components/ui/CountTab';
import type { FollowUpBucket } from '@/features/leads/leadsApi';
import { useThemeColors, type ThemeColors } from '@/theme';

export type FollowUpTab = 'calendar' | FollowUpBucket;

/** Below this, three badges no longer fit at the normal gap. */
const NARROW_WIDTH = 390;

type Props = {
  active: FollowUpTab;
  /** Follow-ups on the selected date. Hidden until known, and when there are none. */
  calendarCount?: number;
  /** Hidden until known, and when nothing is overdue. */
  overdueCount?: number;
  /** Open follow-ups not yet due. Hidden until known, and when there are none. */
  upcomingCount?: number;
  onChange: (tab: FollowUpTab) => void;
};

/**
 * Tap to switch: the week strip below already owns the horizontal swipe. The
 * row only scrolls when badges outgrow a small screen or a large font setting.
 */
export function FollowUpTabs({
  active,
  calendarCount,
  overdueCount,
  upcomingCount,
  onChange,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  return (
    <ScrollView
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={styles.scroller}
      contentContainerStyle={[styles.row, width < NARROW_WIDTH && styles.rowNarrow]}
    >
      <CountTab
        label="Calendar"
        count={calendarCount || undefined}
        active={active === 'calendar'}
        onPress={() => onChange('calendar')}
      />
      <CountTab
        label="Overdue"
        count={overdueCount || undefined}
        active={active === 'overdue'}
        onPress={() => onChange('overdue')}
      />
      <CountTab
        label="Upcoming"
        count={upcomingCount || undefined}
        active={active === 'upcoming'}
        onPress={() => onChange('upcoming')}
      />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroller: { flexGrow: 0, backgroundColor: colors.surface },
    row: {
      flexDirection: 'row',
      gap: 20,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    rowNarrow: { gap: 8 },
  });
}
