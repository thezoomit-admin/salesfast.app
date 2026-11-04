import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CountTab } from '@/components/ui/CountTab';
import type { FollowUpBucket } from '@/features/leads/leadsApi';
import { useThemeColors, type ThemeColors } from '@/theme';

export type FollowUpTab = 'calendar' | FollowUpBucket;

type Props = {
  active: FollowUpTab;
  /** Hidden until known, and when nothing is overdue. */
  overdueCount?: number;
  onChange: (tab: FollowUpTab) => void;
};

/** Tap only: the week strip below already owns the horizontal swipe. */
export function FollowUpTabs({ active, overdueCount, onChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View accessibilityRole="tablist" style={styles.row}>
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
  });
}
