import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography, useTheme, type ThemeColors } from '@/theme';

/** Soft card washes; dark mode drops to one muted surface. */
export function homeTints(colors: ThemeColors, isDark: boolean) {
  const flat = colors.surfaceMuted;
  return {
    cream: isDark ? flat : '#FDF6E9',
    mint: isDark ? flat : '#EDF5F3',
    lime: isDark ? flat : '#F6F8EC',
    lilac: isDark ? flat : '#F6EFFC',
    aqua: isDark ? flat : '#E9FBFC',
  };
}

type Props = {
  title: string;
  onSeeAll?: () => void;
  children: ReactNode;
};

export function HomeSection({ title, onSeeAll, children }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onSeeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`See all ${title}`}
            onPress={onSeeAll}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { gap: 12 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    seeAll: {
      ...typography.caption,
      fontSize: 14,
      fontWeight: '600',
      color: colors.brand,
    },
    pressed: { opacity: 0.7 },
  });
}
