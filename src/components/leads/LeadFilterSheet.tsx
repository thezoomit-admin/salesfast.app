import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { FilterChip } from '@/components/ui/FilterChip';
import { FilterSection, FilterSheet } from '@/components/ui/FilterSheet';
import {
  CREATED_OPTIONS,
  ENGAGEMENT_OPTIONS,
  FOLLOW_UP_OPTIONS,
  NO_LEAD_FILTERS,
  PRIORITY_OPTIONS,
  SORT_OPTIONS,
  leadFilterCount,
  type LeadFilters,
} from '@/features/leads/leadFilters';
import { useThemeColors } from '@/theme';

type Props = {
  open: boolean;
  value: LeadFilters;
  sources: readonly { id: number; name: string }[];
  sourcesLoading: boolean;
  onApply: (filters: LeadFilters) => void;
  onClose: () => void;
};

/** Tap again to drop a one-of-many pick. */
const toggleOne = <T,>(current: T | null, key: T) =>
  current === key ? null : key;

/** Sorted, so the same picks always share one cached result. */
const toggleMany = <T,>(current: T[], key: T, order: readonly T[]) => {
  const picked = current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key];
  return order.filter((k) => picked.includes(k));
};

/** Sort and filters for the Leads list. Picks apply on Apply, not on each tap. */
export function LeadFilterSheet({
  open,
  value,
  sources,
  sourcesLoading,
  onApply,
  onClose,
}: Props) {
  const colors = useThemeColors();
  const [wasOpen, setWasOpen] = useState(open);
  const [draft, setDraft] = useState(value);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  const sourceOrder = sources.map((s) => s.id);

  return (
    <FilterSheet
      open={open}
      title="Filter leads"
      clearDisabled={leadFilterCount(draft) === 0}
      onClear={() => setDraft(NO_LEAD_FILTERS)}
      onApply={() => onApply(draft)}
      onClose={onClose}
    >
      <FilterSection title="Sort by">
        {SORT_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.sort === option.key}
            onPress={() => setDraft((d) => ({ ...d, sort: option.key }))}
          />
        ))}
      </FilterSection>

      <FilterSection title="Temperature">
        {PRIORITY_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.priorities.includes(option.key)}
            onPress={() =>
              setDraft((d) => ({
                ...d,
                priorities: toggleMany(
                  d.priorities,
                  option.key,
                  PRIORITY_OPTIONS.map((o) => o.key)
                ),
              }))
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Follow-up">
        {FOLLOW_UP_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.followUp === option.key}
            onPress={() =>
              setDraft((d) => ({
                ...d,
                followUp: toggleOne(d.followUp, option.key),
              }))
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Engagement">
        {ENGAGEMENT_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.engagement === option.key}
            onPress={() =>
              setDraft((d) => ({
                ...d,
                engagement: toggleOne(d.engagement, option.key),
              }))
            }
          />
        ))}
      </FilterSection>

      <FilterSection title="Created">
        {CREATED_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.created === option.key}
            onPress={() =>
              setDraft((d) => ({
                ...d,
                created: toggleOne(d.created, option.key),
              }))
            }
          />
        ))}
      </FilterSection>

      {sourcesLoading || sources.length > 0 ? (
        <FilterSection title="Source">
          {sourcesLoading ? <ActivityIndicator color={colors.brand} /> : null}
          {sources.map((source) => (
            <FilterChip
              key={source.id}
              label={source.name}
              active={draft.sourceIds.includes(source.id)}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  sourceIds: toggleMany(d.sourceIds, source.id, sourceOrder),
                }))
              }
            />
          ))}
        </FilterSection>
      ) : null}
    </FilterSheet>
  );
}
