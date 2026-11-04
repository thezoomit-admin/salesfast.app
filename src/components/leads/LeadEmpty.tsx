import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';

import {
  CircleCheckIcon,
  PermanentJobIcon,
  Search02Icon,
} from '@/components/icons/hugeicons';
import { EmptyState } from '@/components/ui/StateViews';
import { useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
type EmptyTone = 'brand' | 'success';

export type LeadEmptyKind = 'all' | 'unread' | 'filtered';

const COPY: Record<
  LeadEmptyKind,
  {
    title: string;
    message: string;
    icon: HugeIconData;
    tone: EmptyTone;
    actionLabel?: string;
  }
> = {
  all: {
    title: 'No leads yet',
    message:
      'Leads assigned to you will appear here. Switch tabs or add a new lead to get started.',
    icon: PermanentJobIcon,
    tone: 'brand',
  },
  unread: {
    title: "You're all caught up",
    message:
      'Every lead assigned to you has been opened. New assignments will show an unread badge.',
    icon: CircleCheckIcon,
    tone: 'success',
  },
  filtered: {
    title: 'No matching leads',
    message:
      'Nothing matches this search or filter. Try clearing filters or using a different term.',
    icon: Search02Icon,
    tone: 'brand',
    actionLabel: 'Clear filters',
  },
};

function toneColors(colors: ThemeColors, tone: EmptyTone) {
  if (tone === 'success') return { fg: colors.success, bg: colors.successSoft };
  return { fg: colors.brand, bg: colors.primary50 };
}

/** Polished empty state for All / Unread / filtered lead lists. */
export function LeadEmpty({
  kind,
  onClearFilters,
}: {
  kind: LeadEmptyKind;
  onClearFilters?: () => void;
}) {
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
      actionLabel={copy.actionLabel}
      onAction={copy.actionLabel ? onClearFilters : undefined}
    />
  );
}
