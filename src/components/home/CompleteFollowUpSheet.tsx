import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { followUpTypeLabel } from '@/components/followups/followUpCalendar';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import {
  appendClipLinks,
  composerChannels,
  NoteComposer,
  type VoiceClip,
} from '@/components/leads/NoteComposer';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import {
  formatFollowupDateOnly,
  formatFollowupDisplay,
  serializeActivityFlow,
} from '@/features/leads/addNoteLogic';
import { addLeadNote, noteChannelsQuery } from '@/features/leads/leadsApi';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { FollowUpOutcome, MobileDashboard, MyFollowUp } from '@/types/api';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 720;
const OPEN_MS = 280;
const CLOSE_MS = 240;

/** Done within this long after due counts as on time (same rule as the server). */
const ON_TIME_GRACE_MS = 24 * 60 * 60 * 1000;

const OUTCOMES: { value: FollowUpOutcome; label: string }[] = [
  { value: 'REACHED', label: 'Reached' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'CALL_BACK_LATER', label: 'Call back later' },
  { value: 'NOT_INTERESTED', label: 'Not interested' },
];

type Props = {
  open: boolean;
  /** The follow-up row, patched in the caches the moment Mark done is tapped. */
  followUpId: number;
  dueAt: string;
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
type CompleteVars = {
  leadId: number;
  followUpId: number;
  dueAt: string;
  text: string;
  clips: VoiceClip[];
  payload: Omit<Parameters<typeof addLeadNote>[1], 'note'> & { flow: string };
};

/** Show the follow-up as done everywhere it is cached; returns the old data to roll back. */
function markDoneInCaches(
  client: ReturnType<typeof useQueryClient>,
  vars: CompleteVars
) {
  const now = new Date();
  const onTime = now.getTime() - new Date(vars.dueAt).getTime() <= ON_TIME_GRACE_MS;
  const prev = [
    ...client.getQueriesData({ queryKey: ['my-follow-ups'] }),
    ...client.getQueriesData({ queryKey: dashboardQuery.queryKey }),
  ];
  client.setQueriesData<{ items: MyFollowUp[] }>({ queryKey: ['my-follow-ups'] }, (data) =>
    data?.items
      ? {
          ...data,
          items: data.items.map((f) =>
            f.id === vars.followUpId
              ? {
                  ...f,
                  status: 'DONE' as const,
                  doneAt: now.toISOString(),
                  onTime,
                  outcome: vars.payload.outcome ?? null,
                  outcomeNote: vars.text,
                }
              : f
          ),
        }
      : data
  );
  client.setQueryData<MobileDashboard>(dashboardQuery.queryKey, (data) =>
    data
      ? {
          ...data,
          upcomingFollowUps: data.upcomingFollowUps.filter((f) => f.id !== vars.followUpId),
        }
      : data
  );
  return prev;
}

export function CompleteFollowUpSheet({
  open,
  followUpId,
  dueAt,
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
  const [clips, setClips] = useState<VoiceClip[]>([]);
  const [recording, setRecording] = useState(false);
  const [next, setNext] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const channelOptions = useMemo(() => composerChannels(channels.data), [channels.data]);

  // Call until the agent picks another channel.
  const selectedChannelId = channelId ?? channelOptions[0]?.id ?? null;

  // Optimistic: the card turns Done and the sheet closes at once; the note
  // (and any voice clips) upload in the background. A failure rolls back.
  const mutation = useMutation({
    mutationFn: async ({ leadId: id, text, clips: toUpload, payload }: CompleteVars) => {
      const { flow, ...rest } = payload;
      const body = await appendClipLinks(text, toUpload);
      await addLeadNote(id, { ...rest, note: flow ? `${body}\n\n${flow}` : body });
    },
    onMutate: async (vars) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['my-follow-ups'] }),
        queryClient.cancelQueries({ queryKey: dashboardQuery.queryKey }),
      ]);
      return { prev: markDoneInCaches(queryClient, vars) };
    },
    onError: (err, _vars, ctx) => {
      for (const [key, data] of ctx?.prev ?? []) queryClient.setQueryData(key, data);
      Alert.alert('Could not mark as done', getErrorMessage(err));
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey });
      void queryClient.invalidateQueries({ queryKey: ['my-follow-ups'] });
      void queryClient.invalidateQueries({ queryKey: ['my-leads'] });
      void queryClient.invalidateQueries({ queryKey: ['lead', vars.leadId] });
    },
  });

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    setChannelId(null);
    setOutcome('REACHED');
    setNote('');
    setClips([]);
    setRecording(false);
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
    if (closingRef.current) return;
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
    if (recording) return;
    if (next && next.getTime() <= Date.now()) {
      setError('Pick a future time for the next follow-up.');
      return;
    }
    const outcomeLabel = OUTCOMES.find((o) => o.value === outcome)?.label ?? 'Done';
    const type = followUpType || 'FOLLOWUP';
    mutation.mutate({
      leadId,
      followUpId,
      dueAt,
      text: note.trim() || `Follow-up done · ${outcomeLabel}.`,
      clips,
      payload: {
        channelId: selectedChannelId ?? undefined,
        outcome,
        completeFollowup: true,
        flow: next
          ? serializeActivityFlow([
              {
                title: 'Next Follow-up',
                detail: followUpTypeLabel(type),
                lines: [`Scheduled for: ${formatFollowupDisplay(next)}`],
              },
            ])
          : '',
        ...(next
          ? {
              followupAt: next.toISOString(),
              followupDate: formatFollowupDateOnly(next),
              followupType: type,
            }
          : {}),
      },
    });
    runCloseAnimation(true);
  };

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={animateClose}
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

            <NoteComposer
              note={note}
              onChangeNote={setNote}
              clips={clips}
              onChangeClips={setClips}
              channels={channelOptions}
              channelId={selectedChannelId}
              onChangeChannel={setChannelId}
              onRecordingChange={setRecording}
              placeholder="What happened? (optional)"
            />

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
              onPress={animateClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              // Saving waits for a voice note being recorded to finish.
              disabled={recording}
              onPress={save}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && styles.pressed,
                recording && styles.disabled,
              ]}
            >
              <Text style={styles.saveLabel}>Mark done</Text>
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
    disabled: { opacity: 0.5 },
  });
}
