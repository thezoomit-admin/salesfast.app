import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const OPEN_MS = 280;
const CLOSE_MS = 240;

type Props = {
  open: boolean;
  title: string;
  /** Nothing picked, so Clear all has nothing to do. */
  clearDisabled: boolean;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Bottom sheet chrome for filters — account-switch look, Clear all and Apply
 * in the footer. The caller holds the picks and applies them on Apply.
 */
export function FilterSheet({
  open,
  title,
  clearDisabled,
  onClear,
  onApply,
  onClose,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  // Past the bottom on any phone, however tall the sheet grows.
  const [offscreen] = useState(() => Dimensions.get('window').height);
  const [translateY] = useState(() => new Animated.Value(offscreen));
  const [backdropOp] = useState(() => new Animated.Value(0));

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMounted(true);
  }

  useEffect(() => {
    if (!open) return;
    translateY.setValue(offscreen);
    backdropOp.setValue(0);
    const frame = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, translateY, backdropOp, offscreen]);

  /** A second call restarts the slide; only the run that finishes closes. */
  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: offscreen,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      onClose();
    });
  }, [backdropOp, translateY, onClose, offscreen]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            close();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [translateY, close]
  );

  const apply = () => {
    onApply();
    close();
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.backdropHit} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          <View style={styles.footerRule} />

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: clearDisabled }}
              disabled={clearDisabled}
              onPress={onClear}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            >
              <Text
                style={[styles.clearLabel, clearDisabled && styles.clearDisabled]}
              >
                Clear all
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={({ pressed }) => [styles.applyBtn, pressed && styles.pressed]}
            >
              <Text style={styles.applyLabel}>Apply</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Heading plus its options, wrapped as chips unless `chips` is off. */
export function FilterSection({
  title,
  chips = true,
  children,
}: {
  title: string;
  chips?: boolean;
  children: ReactNode;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <>
      <Text style={styles.heading}>{title}</Text>
      {chips ? <View style={styles.chips}>{children}</View> : children}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    backdropFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: { flex: 1 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 20,
      maxHeight: '88%',
    },
    dragZone: { paddingTop: 2, paddingBottom: 4 },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: 14,
      backgroundColor: colors.border,
    },
    title: {
      ...typography.subtitle,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    scroll: { flexGrow: 0, flexShrink: 1 },
    heading: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 8,
      marginHorizontal: -spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: 12,
    },
    clearBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    clearLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    clearDisabled: { color: colors.textMuted },
    applyBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
    },
    applyLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },
    pressed: { opacity: 0.72 },
  });
}
