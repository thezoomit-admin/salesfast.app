import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { CountTab } from '@/components/ui/CountTab';
import type { FollowUpBucket } from '@/features/leads/leadsApi';
import { useThemeColors, type ThemeColors } from '@/theme';

export type FollowUpTab = 'calendar' | FollowUpBucket;

/** Below this, two three-digit badges no longer fit at the normal gap. */
const NARROW_WIDTH = 360;

type Props = {
  active: FollowUpTab;
  /** Hidden until known, and when nothing is overdue. */
  overdueCount?: number;
  /** Open follow-ups not yet due. Hidden until known, and when there are none. */
  upcomingCount?: number;
  onChange: (tab: FollowUpTab) => void;
};

/** Tap only: the week strip below already owns the horizontal swipe. */
export function FollowUpTabs({ active, overdueCount, upcomingCount, onChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.row, width < NARROW_WIDTH && styles.rowNarrow]}
    >
      <CountTab
        label="Calendar"
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
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 20,
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: colors.surface,
    },
    rowNarrow: { gap: 8 },
  });
}
