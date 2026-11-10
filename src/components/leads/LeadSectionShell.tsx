import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  cardShadow,
  leadDetailPalette,
  type LeadDetailPalette,
} from '@/components/leads/leadDetailPalette';
import {
  radii,
  spacing,
  typography,
  useTheme,
  useThemeColors,
  type ThemeColors,
} from '@/theme';

export type SectionPill = {
  key: string;
  label: string;
  count?: number;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

type Props = {
  pills?: SectionPill[];
  activeKey?: string;
  onPillChange?: (key: string) => void;
  children: ReactNode;
};

/** Lead Details card: tab pills on top, the active panel below. */
export function LeadSectionShell({
  pills,
  activeKey,
  onPillChange,
  children,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = useMemo(
    () => leadDetailPalette(colors, isDark),
    [colors, isDark]
  );
  const styles = useMemo(
    () => createStyles(colors, palette, isDark),
    [colors, palette, isDark]
  );

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
            const tint = active ? colors.white : palette.ink;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => onPillChange?.(p.key)}
                style={({ pressed }) => [
                  styles.pill,
                  active ? styles.pillActive : styles.pillIdle,
                  pressed && styles.pressed,
                ]}
              >
                {p.icon ? (
                  <Ionicons name={p.icon} size={18} color={tint} />
                ) : null}
                <Text style={[styles.pillText, { color: tint }]}>
                  {p.count != null ? `${p.label}  ${p.count}` : p.label}
                </Text>
              </Pressable>
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
  const styles = useMemo(() => createDayStyles(colors), [colors]);
  return (
    <View style={styles.dayHeader}>
      <Text style={styles.dayLabel}>{label}</Text>
    </View>
  );
}

function createStyles(
  colors: ThemeColors,
  palette: LeadDetailPalette,
  isDark: boolean
) {
  return StyleSheet.create({
    shell: {
      backgroundColor: palette.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      paddingTop: spacing.md,
      gap: spacing.sm,
      ...cardShadow(isDark),
    },
    pillRow: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 42,
      paddingHorizontal: 16,
      borderRadius: radii.md,
    },
    pillActive: { backgroundColor: colors.brand },
    pillIdle: { backgroundColor: palette.tint },
    pillText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
    },
    pressed: { opacity: 0.85 },
    body: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.md,
      minHeight: 160,
    },
  });
}

function createDayStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
