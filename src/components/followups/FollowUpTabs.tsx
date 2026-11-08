import { StyleSheet, View } from 'react-native';

import type { FollowUpBucket } from '@/features/leads/leadsApi';
import { NotificationTabs } from '@/features/notifications/NotificationTabs';

export type FollowUpTab = 'calendar' | FollowUpBucket;

const TABS: { key: FollowUpTab; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
];

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
 * The Notifications pill track, so both hero pages share one tab design. Tap
 * to switch: the week strip below already owns the horizontal swipe.
 */
export function FollowUpTabs({
  active,
  calendarCount,
  overdueCount,
  upcomingCount,
  onChange,
}: Props) {
  return (
    <View style={styles.wrap}>
      <NotificationTabs
        tabs={TABS}
        unread={{
          calendar: calendarCount,
          overdue: overdueCount,
          upcoming: upcomingCount,
        }}
        countLabel="follow-ups"
        active={active}
        onChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
});
