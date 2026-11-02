import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Apply standard horizontal screen padding. Default true. */
  padded?: boolean;
};

/**
 * Horizontal chip row that does not flex-stretch vertically
 * (horizontal ScrollView otherwise fills leftover height).
 * Hisab ChipScroll pattern.
 */
export function ChipScroll({
  children,
  style,
  contentContainerStyle,
  padded = true,
}: Props) {
  return (
    <View style={[styles.wrap, padded && styles.padded, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 0,
    marginBottom: spacing.md,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    alignItems: 'center',
    paddingRight: 4,
    gap: spacing.sm,
  },
});
