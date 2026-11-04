import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { MultiplicationSignIcon } from '@/components/icons/hugeicons';
import { ChipScroll } from '@/components/ui/ChipScroll';
import type { LeadFilterPill, LeadFilters } from '@/features/leads/leadFilters';
import { radii, spacing, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  pills: LeadFilterPill[];
  onChange: (filters: LeadFilters) => void;
  onClear: () => void;
};

/** What the list is narrowed by. Clear all leads, so it never scrolls away. */
export function LeadFilterPills({ pills, onChange, onClear }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <ChipScroll style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Clear all filters"
        onPress={onClear}
        hitSlop={{ top: 6, bottom: 6 }}
        style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
      >
        <Text style={styles.clearLabel}>Clear all</Text>
      </Pressable>
      {pills.map((pill) => (
        <Pressable
          key={pill.key}
          accessibilityRole="button"
          accessibilityLabel={`Remove filter ${pill.label}`}
          onPress={() => onChange(pill.without)}
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <Text style={styles.pillLabel} numberOfLines={1}>
            {pill.label}
          </Text>
          <HugeiconsIcon
            icon={MultiplicationSignIcon}
            size={14}
            color={colors.brand}
            strokeWidth={2}
          />
        </Pressable>
      ))}
    </ChipScroll>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { marginBottom: 10 },
    clear: {
      flexShrink: 0,
      minHeight: 30,
      justifyContent: 'center',
      paddingRight: spacing.xs,
    },
    clearLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.textMuted,
    },
    pill: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 30,
      paddingLeft: 12,
      paddingRight: 8,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.brand,
      backgroundColor: colors.surface,
    },
    pillLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
      color: colors.brand,
    },
    pressed: { opacity: 0.7 },
  });
}
