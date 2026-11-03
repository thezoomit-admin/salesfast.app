import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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

const SHEET_OFFSCREEN = 560;
const OPEN_MS = 420;
const CLOSE_MS = 320;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.85;
const CONFETTI_BURST_MS = 1600;
/** Soft ease — slow settle, no overshoot. */
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_SOFT = Easing.bezier(0.33, 0, 0.2, 1);

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  buttonLabel?: string;
  onClose: () => void;
  onAction?: () => void;
};

/** Celebratory success bottom sheet — check + confetti, slide from bottom. */
export function SuccessSheet({
  open,
  title = 'Successful',
  message = 'Your note has been added successfully.',
  buttonLabel = 'Done',
  onClose,
  onAction,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.72)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.94)).current;
  const contentOp = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(12)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const [confettiCycle, setConfettiCycle] = useState(0);

  const resetHero = () => {
    checkScale.setValue(0.72);
    checkOpacity.setValue(0);
    ringScale.setValue(0.94);
    contentOp.setValue(0);
    contentY.setValue(12);
  };

  const finishClose = (notify: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    resetHero();
    closingRef.current = false;
    if (notify) onCloseRef.current();
  };

  const runClose = (notify: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_OFFSCREEN,
        duration: CLOSE_MS,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, {
        toValue: 0,
        duration: 200,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(contentOp, {
        toValue: 0,
        duration: 180,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setConfettiCycle(0);
        finishClose(notify);
      } else closingRef.current = false;
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
      resetHero();
      setConfettiCycle(0);
      const frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOp, {
            toValue: 1,
            duration: OPEN_MS,
            easing: EASE_OUT,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: OPEN_MS,
            easing: EASE_OUT,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(90),
            Animated.parallel([
              Animated.timing(ringScale, {
                toValue: 1,
                duration: 560,
                easing: EASE_OUT,
                useNativeDriver: true,
              }),
              Animated.timing(checkOpacity, {
                toValue: 1,
                duration: 480,
                easing: EASE_OUT,
                useNativeDriver: true,
              }),
              Animated.timing(checkScale, {
                toValue: 1,
                duration: 620,
                easing: EASE_OUT,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.sequence([
            Animated.delay(180),
            Animated.parallel([
              Animated.timing(contentOp, {
                toValue: 1,
                duration: 480,
                easing: EASE_OUT,
                useNativeDriver: true,
              }),
              Animated.timing(contentY, {
                toValue: 0,
                duration: 520,
                easing: EASE_OUT,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!mountedRef.current || closingRef.current) return;
    runClose(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Burst once when the sheet opens — no loop.
  useEffect(() => {
    if (!open || !mounted) return;
    const start = setTimeout(() => setConfettiCycle(1), 220);
    return () => clearTimeout(start);
  }, [open, mounted]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !closingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !closingRef.current &&
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
      onRequestClose={animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={animateClose}
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
          </View>

          <View style={styles.hero}>
            {confettiCycle > 0 ? (
              <ConfettiBurst key={confettiCycle} />
            ) : null}
            <Animated.View
              style={[
                styles.ringOuter,
                { transform: [{ scale: ringScale }] },
              ]}
            >
              <View style={styles.ringMid}>
                <Animated.View
                  style={[
                    styles.checkCircle,
                    {
                      opacity: checkOpacity,
                      transform: [{ scale: checkScale }],
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={36} color="#FFFFFF" />
                </Animated.View>
              </View>
            </Animated.View>
          </View>

          <Animated.View
            style={{
              alignSelf: 'stretch',
              alignItems: 'center',
              opacity: contentOp,
              transform: [{ translateY: contentY }],
            }}
          >
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onAction?.();
                animateClose();
              }}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.actionText}>{buttonLabel}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Color bits fly out from the check center once, then vanish. */
function ConfettiBurst() {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: CONFETTI_BURST_MS,
      easing: EASE_OUT,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  // Final offsets from hero center (80, 70).
  const bits: {
    dx: number;
    dy: number;
    color: string;
    w: number;
    h: number;
    r: number;
    rot: string;
  }[] = [
    { dx: -58, dy: -64, color: '#F97316', w: 11, h: 11, r: 3, rot: '25deg' },
    { dx: -24, dy: -60, color: '#A78BFA', w: 9, h: 14, r: 4, rot: '-20deg' },
    { dx: 28, dy: -72, color: '#60A5FA', w: 12, h: 6, r: 3, rot: '40deg' },
    { dx: 60, dy: -52, color: '#F43F5E', w: 10, h: 10, r: 4, rot: '10deg' },
    { dx: -72, dy: -10, color: '#34D399', w: 8, h: 13, r: 3, rot: '-35deg' },
    { dx: 72, dy: 4, color: '#FBBF24', w: 11, h: 7, r: 3, rot: '15deg' },
    { dx: -36, dy: 36, color: '#818CF8', w: 9, h: 9, r: 4, rot: '0deg' },
    { dx: 38, dy: 34, color: '#FB923C', w: 12, h: 5, r: 3, rot: '-10deg' },
    { dx: -10, dy: -78, color: '#C084FC', w: 8, h: 8, r: 4, rot: '18deg' },
    { dx: 14, dy: 48, color: '#2DD4BF', w: 10, h: 6, r: 3, rot: '-12deg' },
  ];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {bits.map((b, i) => {
        // Keep all keys in [0, 1] and strictly non-decreasing.
        const delayPad = Math.min(i * 0.03, 0.24);
        const mid = Math.min(0.18 + delayPad, 0.42);
        const appear = Math.min(0.08 + delayPad, 0.22);
        const hold = Math.min(0.42 + delayPad * 0.5, 0.58);
        const fade = Math.min(0.7 + delayPad * 0.3, 0.88);
        const scalePeak = Math.min(0.2 + delayPad, 0.36);

        const tx = progress.interpolate({
          inputRange: [0, mid, 1],
          outputRange: [0, b.dx * 0.4, b.dx * 1.45],
          extrapolate: 'clamp',
        });
        const ty = progress.interpolate({
          inputRange: [0, mid, 1],
          outputRange: [0, b.dy * 0.4, b.dy * 1.45],
          extrapolate: 'clamp',
        });
        const op = progress.interpolate({
          inputRange: [0, appear, hold, fade, 1],
          outputRange: [0, 1, 1, 0.35, 0],
          extrapolate: 'clamp',
        });
        const sc = progress.interpolate({
          inputRange: [0, scalePeak, 0.7, 1],
          outputRange: [0.25, 1.2, 1.08, 0.6],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 70 - b.h / 2,
              left: 80 - b.w / 2,
              width: b.w,
              height: b.h,
              borderRadius: b.r,
              backgroundColor: b.color,
              opacity: op,
              transform: [
                { translateX: tx },
                { translateY: ty },
                { scale: sc },
                { rotate: b.rot },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const ink = isDark ? colors.text : '#111827';

  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdropFill: {
      ...StyleSheet.absoluteFill,
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
      backgroundColor: isDark ? '#143526' : '#E8F8EF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringMid: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: isDark ? '#1B4D34' : '#C6F0D8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#22C55E',
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
      backgroundColor: '#000000',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
