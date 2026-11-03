import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { followUpTypeLabel } from '@/components/followups/followUpCalendar';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  formatFollowupDateOnly,
  formatFollowupDisplay,
  serializeActivityFlow,
} from '@/features/leads/addNoteLogic';
import { addLeadNote, noteChannelsQuery } from '@/features/leads/leadsApi';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { FollowUpOutcome } from '@/types/api';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 720;
const OPEN_MS = 280;
const CLOSE_MS = 240;

/** Channels that are a real touch with the lead — offered first. */
const TOUCH_CHANNELS = ['call', 'whatsapp', 'email', 'sms', 'in-person'];

const OUTCOMES: { value: FollowUpOutcome; label: string }[] = [
  { value: 'REACHED', label: 'Reached' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'CALL_BACK_LATER', label: 'Call back later' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
];

type Props = {
  open: boolean;
  leadId: number;
  leadName: string;
  followUpType: string | null;
  onClose: () => void;
};

/**
 * Mark a follow-up done: how the lead was reached, the outcome, a note, and
 * the next follow-up (the CRM rule: an open lead always has a next step).
 * Bottom sheet — same motion/chrome as RescheduleFollowUpSheet.
 */
export function CompleteFollowUpSheet({
  open,
  leadId,
  leadName,
  followUpType,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const queryClient = useQueryClient();
  const channels = useQuery({ ...noteChannelsQuery, enabled: open });

  const [channelId, setChannelId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<FollowUpOutcome>('REACHED');
  const [note, setNote] = useState('');
  const [next, setNext] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const busyRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const channelOptions = useMemo(() => {
    const list = channels.data ?? [];
    const rank = (name: string) => {
      const i = TOUCH_CHANNELS.indexOf(name.trim().toLowerCase());
      return i < 0 ? TOUCH_CHANNELS.length : i;
    };
    return [...list].sort((a, b) => rank(a.name) - rank(b.name));
  }, [channels.data]);

  // Call (first touch channel) until the agent picks one.
  const selectedChannelId = channelId ?? channelOptions[0]?.id ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      const outcomeLabel = OUTCOMES.find((o) => o.value === outcome)?.label ?? 'Done';
      const text = note.trim() || `Follow-up done · ${outcomeLabel}.`;
      const type = followUpType || 'FOLLOWUP';
      const flow = next
        ? serializeActivityFlow([
            {
              title: 'Next Follow-up',
              detail: followUpTypeLabel(type),
              lines: [`Scheduled for: ${formatFollowupDisplay(next)}`],
            },
          ])
        : '';
      await addLeadNote(leadId, {
        note: flow ? `${text}\n\n${flow}` : text,
        channelId: selectedChannelId ?? undefined,
        outcome,
        completeFollowup: true,
        ...(next
          ? {
              followupAt: next.toISOString(),
              followupDate: formatFollowupDateOnly(next),
              followupType: type,
            }
          : {}),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['my-follow-ups'] }),
        queryClient.invalidateQueries({ queryKey: ['my-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
      ]);
      busyRef.current = false;
      runCloseAnimation(true);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  busyRef.current = mutation.isPending;

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    setChannelId(null);
    setOutcome('REACHED');
    setNote('');
    setNext(null);
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
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
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

  const save = () => {
    if (next && next.getTime() <= Date.now()) {
      setError('Pick a future time for the next follow-up.');
      return;
    }
    setError(null);
    mutation.mutate();
  };

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={mutation.isPending ? undefined : animateClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            <Text style={styles.title}>Mark as done</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {leadName}
            </Text>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>How did you reach them?</Text>
              {channels.isPending ? (
                <ActivityIndicator color={colors.textMuted} style={styles.loading} />
              ) : (
                <View style={styles.pillRow}>
                  {channelOptions.map((c) => (
                    <Pill
                      key={c.id}
                      label={c.name}
                      active={selectedChannelId === c.id}
                      onPress={() => setChannelId(c.id)}
                      styles={styles}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Outcome</Text>
              <View style={styles.pillRow}>
                {OUTCOMES.map((o) => (
                  <Pill
                    key={o.value}
                    label={o.label}
                    active={outcome === o.value}
                    onPress={() => setOutcome(o.value)}
                    styles={styles}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="What happened? (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={5000}
                textAlignVertical="top"
                keyboardAppearance={isDark ? 'dark' : 'light'}
                selectionColor={colors.brand}
              />
            </View>

            <View style={styles.section}>
              <FollowupDateTimeField
                label="Next follow-up"
                value={next}
                onChange={setNext}
                disablePastDays
              />
              <Text style={styles.hint}>
                {next
                  ? 'A new follow-up will be scheduled.'
                  : 'Leave empty only if there is no next step.'}
              </Text>
            </View>
          </ScrollView>

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
              disabled={mutation.isPending}
              onPress={save}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && !mutation.isPending && styles.pressed,
              ]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveLabel}>Mark done</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Pill({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1 },
    backdropFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: { flex: 1 },
    sheet: {
      maxHeight: '88%',
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
      paddingHorizontal: 2,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      paddingHorizontal: 2,
    },
    body: { flexGrow: 0 },
    bodyContent: { gap: 16, paddingBottom: 4 },
    section: { gap: 8 },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '600',
    },
    loading: { alignSelf: 'flex-start', paddingVertical: 6 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surfaceMuted : colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: colors.brand,
      backgroundColor: colors.primary50,
    },
    pillLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
    noteInput: {
      minHeight: 84,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
    hint: { ...typography.caption, color: colors.textMuted },
    error: { ...typography.caption, color: colors.danger },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
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
  });
}
