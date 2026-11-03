import { HugeiconsIcon } from '@hugeicons/react-native';
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

import {
  ArrowDownDoubleIcon,
  FlameIcon,
  MinusSignIcon,
} from '@/components/icons/hugeicons';
import {
  PRIORITIES,
  PRIORITY_META,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { LeadPriority } from '@/types/api';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;
const ICON_RADIUS = 10;

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

const PRIORITY_HINT: Record<LeadPriority, string> = {
  LOW: 'Can wait a bit',
  MEDIUM: 'Follow up soon',
  HIGH: 'Needs attention now',
};

type Props = {
  open: boolean;
  leadName: string;
  value: LeadPriority | null;
  saving?: boolean;
  onClose: () => void;
  onSelect: (priority: LeadPriority) => void;
};

/** Bottom sheet — same motion/chrome as AccountSwitchSheet. */
export function PriorityPickerSheet({
  open,
  leadName,
  value,
  saving = false,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const busyRef = useRef(false);
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  busyRef.current = saving;

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    closingRef.current = false;
    if (notifyParent) onCloseRef.current();
  };

  const runCloseAnimation = (notifyParent: boolean) => {
    if (closingRef.current) return;
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
      if (finished) finishClose(notifyParent);
      else closingRef.current = false;
    });
  };

  const animateClose = () => {
    if (closingRef.current || busyRef.current) return;
    runCloseAnimation(true);
  };

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
    runCloseAnimation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !busyRef.current && !closingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !busyRef.current &&
          !closingRef.current &&
          g.dy > 4 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const shouldDismiss =
            g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
          if (shouldDismiss) {
            runCloseAnimation(true);
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
    [translateY, backdropOp]
  );

  const handleSelect = (priority: LeadPriority) => {
    if (busyRef.current || closingRef.current) return;
    if (priority === value) {
      animateClose();
      return;
    }
    onSelect(priority);
  };

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
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <Text style={styles.title} numberOfLines={1}>
              Set priority
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {leadName || 'Lead'}
            </Text>
          </View>

          {PRIORITIES.map((p) => {
            const opt = priorityBadgeColors(p, isDark);
            const selected = value === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: saving }}
                accessibilityLabel={`${PRIORITY_META[p].label} priority`}
                disabled={saving}
                onPress={() => handleSelect(p)}
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !saving && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.iconTile,
                    {
                      backgroundColor: opt.backgroundColor,
                      borderColor: opt.borderColor,
                    },
                  ]}
                >
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[p]}
                    size={18}
                    color={opt.color}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={styles.rowMeta}>
                  <Text style={[styles.rowLabel, { color: opt.color }]}>
                    {PRIORITY_META[p].label}
                  </Text>
                  <Text style={styles.rowHint} numberOfLines={1}>
                    {PRIORITY_HINT[p]}
                  </Text>
                </View>
                {saving && selected ? (
                  <ActivityIndicator color={colors.brand} size="small" />
                ) : selected ? (
                  <Ionicons name="checkmark" size={20} color={opt.color} />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
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
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 20,
    },
    dragZone: {
      paddingTop: 2,
      paddingBottom: 8,
    },
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
      paddingHorizontal: 2,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 10,
      paddingHorizontal: 2,
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: ICON_RADIUS,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    rowMeta: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
    },
    rowHint: {
      ...typography.caption,
      marginTop: 2,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
