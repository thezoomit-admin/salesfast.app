import { ReactNode, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  children: ReactNode;
  /** Hisab-style page header rendered above content (handles its own top inset). */
  header?: ReactNode;
  /** Sticky footer (e.g. lead-detail bottom menu). Handles its own bottom inset. */
  footer?: ReactNode;
  /**
   * Nested inside a parent that already owns safe-area / header
   * (e.g. lead detail tab pages). Skips SafeAreaView chrome.
   */
  embedded?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  header,
  footer,
  embedded = false,
  scroll,
  refreshing,
  onRefresh,
  style,
  contentStyle,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const edges = header
    ? (['left', 'right'] as const)
    : (['top', 'left', 'right'] as const);

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  if (embedded) {
    return <View style={[styles.safe, style]}>{body}</View>;
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={[...edges]}>
      {header}
      <View style={styles.body}>{body}</View>
      {footer}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1 },
    content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  });
}
