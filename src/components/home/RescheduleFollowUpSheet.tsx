import { useMutation, useQueryClient } from '@tanstack/react-query';
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

import { getErrorMessage } from '@/api/client';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  formatFollowupDateOnly,
  formatFollowupDisplay,
} from '@/features/leads/addNoteLogic';
import { addLeadNote } from '@/features/leads/leadsApi';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;

type Props = {
  open: boolean;
  leadId: number;
  leadName: string;
  followUpType: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function defaultSlot() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

/** Bottom sheet — same motion/chrome as AccountSwitchSheet. */
export function RescheduleFollowUpSheet({
  open,
  leadId,
  leadName,
  followUpType,
  onClose,
  onSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [when, setWhen] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const mutation = useMutation({
    mutationFn: async (at: Date) => {
      await addLeadNote(leadId, {
        note: `Rescheduled overdue follow-up to ${formatFollowupDisplay(at)}.`,
        followupAt: at.toISOString(),
        followupDate: formatFollowupDateOnly(at),
        followupType: followUpType || 'FOLLOWUP',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['my-follow-ups'] }),
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
      ]);
      onSuccess?.();
      busyRef.current = false;
      runCloseAnimation(true);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  busyRef.current = mutation.isPending;

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    setWhen(null);
    setError(null);
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
      setWhen(defaultSlot());
      setError(null);
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
  }, [open, leadId]);

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

  const canSave =
    !!when && when.getTime() > Date.now() && !mutation.isPending;

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={mutation.isPending ? undefined : animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={mutation.isPending ? undefined : animateClose}
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
            <Text style={styles.title}>Reschedule follow-up</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {leadName}
            </Text>
          </View>

          <FollowupDateTimeField
            label="New date & time"
            value={when}
            onChange={setWhen}
            disablePastDays
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={mutation.isPending}
              onPress={animateClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && !mutation.isPending && styles.pressed,
              ]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={() => {
                if (!when) return;
                if (when.getTime() <= Date.now()) {
                  setError('Pick a time in the future.');
                  return;
                }
                setError(null);
                mutation.mutate(when);
              }}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && canSave && styles.pressed,
                !canSave && styles.disabled,
              ]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveLabel}>Save</Text>
              )}
            </Pressable>
          </View>
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
      gap: 12,
    },
    dragZone: {
      paddingTop: 2,
      paddingBottom: 4,
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
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    cancelBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    saveBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    saveLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.5 },
  });
}
