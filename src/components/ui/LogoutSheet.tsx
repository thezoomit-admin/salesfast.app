import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

const SHEET_OFFSCREEN = 520;
const OPEN_MS = 280;
const CLOSE_MS = 240;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.85;

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  buttonLabel?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** Sign-out bottom sheet — same layout language as SuccessSheet. */
export function LogoutSheet({
  open,
  title = 'Sign out',
  message = 'End this session on this device? You can sign back in anytime.',
  buttonLabel = 'Sign out',
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);

  const finishClose = (notify: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    closingRef.current = false;
    if (notify) onCloseRef.current();
  };

  const runClose = (notify: boolean) => {
    if (closingRef.current || loadingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_OFFSCREEN,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finishClose(notify);
      else closingRef.current = false;
    });
  };

  const animateClose = () => runClose(true);

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      mountedRef.current = true;
      setMounted(true);
      translateY.setValue(SHEET_OFFSCREEN);
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
    }
    if (!mountedRef.current || closingRef.current) return;
    runClose(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !closingRef.current && !loadingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !closingRef.current &&
          !loadingRef.current &&
          g.dy > 4 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            runClose(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateY]
  );

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={loading ? undefined : animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={loading ? undefined : animateClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.backdropHit} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={loading}
              onPress={animateClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.ringOuter}>
              <View style={styles.ringMid}>
                <View style={styles.iconCircle}>
                  <Ionicons name="log-out-outline" size={32} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && !loading && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionText}>{buttonLabel}</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? colors.text : '#111827';

  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdropFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: {
      flex: 1,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: spacing.xl,
      paddingTop: 8,
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
      elevation: 20,
    },
    dragZone: {
      alignSelf: 'stretch',
      alignItems: 'center',
      minHeight: 36,
      marginBottom: 8,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    closeBtn: {
      position: 'absolute',
      right: 0,
      top: 4,
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hero: {
      width: 160,
      height: 140,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 8,
    },
    ringOuter: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: isDark ? '#2A1210' : '#FEE4E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringMid: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: isDark ? '#3F1A16' : '#FECDCA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.title,
      fontSize: 26,
      fontWeight: '700',
      color: ink,
      textAlign: 'center',
      marginTop: 4,
    },
    message: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
      paddingHorizontal: spacing.md,
    },
    actionBtn: {
      alignSelf: 'stretch',
      marginTop: 28,
      marginBottom: 4,
      paddingVertical: 16,
      borderRadius: radii.pill,
      backgroundColor: isDark ? colors.text : '#111827',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    actionText: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? colors.background : '#FFFFFF',
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.7,
    },
  });
}
