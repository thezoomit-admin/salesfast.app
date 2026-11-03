import type { ReactNode, Ref } from 'react';
import {
  ScrollView,
  type ScrollViewInstance,
  type ScrollViewProps,
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
  /** For callers that scroll the row themselves (e.g. keep the active tab in view). */
  scrollRef?: Ref<ScrollViewInstance>;
  onLayout?: ScrollViewProps['onLayout'];
  onContentSizeChange?: ScrollViewProps['onContentSizeChange'];
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
  scrollRef,
  onLayout,
  onContentSizeChange,
}: Props) {
  return (
    <View style={[styles.wrap, padded && styles.padded, style]}>
      <ScrollView
        ref={scrollRef}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
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
