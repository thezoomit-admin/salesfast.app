import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FilterChip } from '@/components/ui/FilterChip';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

export type SectionPill = {
  key: string;
  label: string;
  count?: number;
};

type Props = {
  pills?: SectionPill[];
  activeKey?: string;
  onPillChange?: (key: string) => void;
  children: ReactNode;
};

/** Web portal pattern: gray shell + pill row + white content body. */
export function LeadSectionShell({
  pills,
  activeKey,
  onPillChange,
  children,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.shell}>
      {pills && pills.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {pills.map((p) => {
            const active = activeKey === p.key;
            return (
              <FilterChip
                key={p.key}
                label={
                  p.count != null ? `${p.label}  ${p.count}` : p.label
                }
                active={active}
                onPress={() => onPillChange?.(p.key)}
              />
            );
          })}
        </ScrollView>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function DayGroupHeader({ label }: { label: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.dayHeader}>
      <Text style={styles.dayLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingTop: spacing.md,
      gap: spacing.md,
      flex: 1,
    },
    pillRow: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    body: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      minHeight: 200,
      flexGrow: 1,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    dayLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });
}
