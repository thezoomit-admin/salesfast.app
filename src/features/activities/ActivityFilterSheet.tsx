import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterChip } from '@/components/ui/FilterChip';
import { FilterSection, FilterSheet } from '@/components/ui/FilterSheet';
import { typography, useTheme, type ThemeColors } from '@/theme';

import { ACTIVITY_ICON, activityAccent } from './ActivityRow';
import {
  DATE_OPTIONS,
  NO_FILTERS,
  TYPE_OPTIONS,
  filterCount,
  type ActivityDateFilter,
  type ActivityFilters,
  type ActivityTypeFilter,
} from './activityFilters';

type Props = {
  open: boolean;
  value: ActivityFilters;
  onApply: (filters: ActivityFilters) => void;
  onClose: () => void;
};

/** Picks apply on Apply, not on each tap. */
export function ActivityFilterSheet({ open, value, onApply, onClose }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [wasOpen, setWasOpen] = useState(open);
  const [draft, setDraft] = useState(value);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(value);
  }

  const toggleType = (key: ActivityTypeFilter) =>
    setDraft((d) => {
      const picked = d.types.includes(key)
        ? d.types.filter((t) => t !== key)
        : [...d.types, key];
      // Option order, so the same picks always share one cached result.
      const types = TYPE_OPTIONS.map((o) => o.key).filter((k) => picked.includes(k));
      return { ...d, types };
    });

  const toggleDate = (key: ActivityDateFilter) =>
    setDraft((d) => {
      const picked = d.dates.includes(key)
        ? d.dates.filter((t) => t !== key)
        : [...d.dates, key];
      const dates = DATE_OPTIONS.map((o) => o.key).filter((k) => picked.includes(k));
      return { ...d, dates };
    });

  return (
    <FilterSheet
      open={open}
      title="Filter activities"
      clearDisabled={filterCount(draft) === 0}
      onClear={() => setDraft(NO_FILTERS)}
      onApply={() => onApply(draft)}
      onClose={onClose}
    >
      <FilterSection title="Date">
        {DATE_OPTIONS.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            active={draft.dates.includes(option.key)}
            onPress={() => toggleDate(option.key)}
          />
        ))}
      </FilterSection>

      <FilterSection title="Type" chips={false}>
        {TYPE_OPTIONS.map((option) => {
          const checked = draft.types.includes(option.key);
          const accent = activityAccent(option.kind, colors, isDark);
          return (
            <Pressable
              key={option.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={option.label}
              onPress={() => toggleType(option.key)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: `${accent}26` }]}>
                <Ionicons name={ACTIVITY_ICON[option.kind]} size={18} color={accent} />
              </View>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {option.label}
              </Text>
              <View
                // Keeps its radius when the fill appears (flattened views lose it).
                collapsable={false}
                style={[styles.checkbox, checked && styles.checkboxOn]}
              >
                {checked ? (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </FilterSection>
    </FilterSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      paddingHorizontal: 2,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.8,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    pressed: { opacity: 0.72 },
  });
}
