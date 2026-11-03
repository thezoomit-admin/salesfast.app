import { HugeiconsIcon } from '@hugeicons/react-native';
import { format } from 'date-fns/format';
import { isToday } from 'date-fns/isToday';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
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

import { followUpTypeLabel } from '@/components/followups/followUpCalendar';
import {
  Calendar03Icon,
  CallIcon,
  CircleCheckIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;
const ICON_RADIUS = 10;

type HugeIconData = ComponentProps<
  typeof HugeiconsIcon
>['icon'];

type ActionKey = 'done' | 'open' | 'reschedule' | 'call';

type Props = {
  open: boolean;
  leadName: string;
  leadPhone?: string | null;
  followUpType: string | null;
  dueAt: string | null;
  onClose: () => void;
  onOpenLead: () => void;
  onReschedule: () => void;
  onCall?: () => void;
  /** Shown while the follow-up is still open. */
  onComplete?: () => void;
};

const typeLabel = followUpTypeLabel;

function subtitleFor(props: {
  followUpType: string | null;
  dueAt: string | null;
}) {
  if (!props.dueAt) return typeLabel(props.followUpType);
  const due = new Date(props.dueAt);
  const parts = [
    typeLabel(props.followUpType),
    format(due, 'h:mm a'),
    !isToday(due) ? format(due, 'dd MMM') : null,
    due.getTime() < Date.now() ? 'Overdue' : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

const ACTIONS: Array<{
  key: ActionKey;
  label: string;
  hint: (phone?: string | null) => string;
  icon: HugeIconData;
  needsPhone?: boolean;
}> = [
  {
    key: 'done',
    label: 'Mark as done',
    hint: () => 'Log the outcome & set the next step',
    icon: CircleCheckIcon,
  },
  {
    key: 'open',
    label: 'Open lead',
    hint: () => 'View details & history',
    icon: UserIcon,
  },
  {
    key: 'reschedule',
    label: 'Reschedule',
    hint: () => 'Pick a new date & time',
    icon: Calendar03Icon,
  },
  {
    key: 'call',
    label: 'Call',
    hint: (phone) => phone?.trim() || 'Dial this lead',
    icon: CallIcon,
    needsPhone: true,
  },
];

/** Bottom sheet — same motion/chrome as AccountSwitchSheet. */
export function FollowUpActionsSheet({
  open,
  leadName,
  leadPhone,
  followUpType,
  dueAt,
  onClose,
  onOpenLead,
  onReschedule,
  onCall,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
    if (closingRef.current) return;
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
        onStartShouldSetPanResponder: () => !closingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
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

  const visibleActions = ACTIONS.filter(
    (a) =>
      (a.key !== 'done' || Boolean(onComplete)) &&
      (!a.needsPhone || Boolean(leadPhone?.trim() && onCall))
  );

  const runAction = (key: ActionKey) => {
    // Fire action while parent still holds the selected item, then dismiss.
    if (key === 'done') onComplete?.();
    else if (key === 'open') onOpenLead();
    else if (key === 'reschedule') onReschedule();
    else if (key === 'call') onCall?.();
    animateClose();
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
              {leadName || 'Follow-up'}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitleFor({ followUpType, dueAt })}
            </Text>
          </View>

          {visibleActions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => runAction(action.key)}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.iconTile}>
                <HugeiconsIcon
                  icon={action.icon}
                  size={18}
                  color={colors.text}
                  strokeWidth={1.8}
                />
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowLabel}>{action.label}</Text>
                <Text style={styles.rowHint} numberOfLines={1}>
                  {action.hint(leadPhone)}
                </Text>
              </View>
            </Pressable>
          ))}

          <View style={styles.footerRule} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={animateClose}
            style={({ pressed }) => [
              styles.footerRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.footerLabel}>Cancel</Text>
          </Pressable>
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
      backgroundColor: colors.surfaceMuted,
    },
    rowMeta: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    rowHint: {
      ...typography.caption,
      marginTop: 2,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 12,
      marginBottom: 4,
      marginHorizontal: -spacing.lg,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 2,
    },
    footerLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
