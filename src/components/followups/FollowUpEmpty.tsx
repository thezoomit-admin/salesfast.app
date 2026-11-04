import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';

import {
  Calendar03Icon,
  CalendarClockIcon,
  ClockAlertIcon,
} from '@/components/icons/hugeicons';
import { EmptyState } from '@/components/ui/StateViews';
import { useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type EmptyTone = 'brand' | 'warning' | 'danger';

export type FollowUpEmptyKind = 'calendar' | 'overdue' | 'upcoming';

const COPY: Record<
  FollowUpEmptyKind,
  {
    title: string;
    message: string;
    icon: HugeIconData;
    tone: EmptyTone;
  }
> = {
  calendar: {
    title: 'Nothing scheduled today',
    message:
      'Your day is clear. Switch dates above, or schedule the next touch from a lead.',
    icon: Calendar03Icon,
    tone: 'brand',
  },
  overdue: {
    title: "You're all clear",
    message:
      'No overdue follow-ups — stay on top of your pipeline and keep this list empty.',
    icon: ClockAlertIcon,
    tone: 'danger',
  },
  upcoming: {
    title: 'No upcoming follow-ups',
    message:
      'When you set the next step on a lead, it will appear here in chronological order.',
    icon: CalendarClockIcon,
    tone: 'warning',
  },
};

function toneColors(colors: ThemeColors, tone: EmptyTone) {
  if (tone === 'warning') return { fg: colors.warning, bg: colors.warningSoft };
  if (tone === 'danger') return { fg: colors.danger, bg: colors.dangerSoft };
  return { fg: colors.brand, bg: colors.primary50 };
}

/** Polished empty state shared by Calendar / Overdue / Upcoming tabs. */
export function FollowUpEmpty({ kind }: { kind: FollowUpEmptyKind }) {
  const colors = useThemeColors();
  const copy = COPY[kind];
  const tint = toneColors(colors, copy.tone);

  return (
    <EmptyState
      title={copy.title}
      message={copy.message}
      iconBackgroundColor={tint.bg}
      iconElement={
        <HugeiconsIcon
          icon={copy.icon}
          size={28}
          color={tint.fg}
          strokeWidth={1.5}
        />
      }
    />
  );
}
