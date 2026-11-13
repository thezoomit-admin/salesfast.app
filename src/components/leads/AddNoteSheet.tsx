import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import {
  ArrowDownDoubleIcon,
  FlameIcon,
  MinusSignIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import {
  appendClipLinks,
  composerChannels,
  NoteComposer,
  type VoiceClip,
} from '@/components/leads/NoteComposer';
import { SuccessSheet } from '@/components/ui/SuccessSheet';
import {
  BOTH,
  buildStatusPayload,
  followupTypeOf,
  formatFollowupDateOnly,
  formatFollowupDisplay,
  isLostStageName,
  isVisitInterest,
  isVisited,
  isWonStageName,
  serializeActivityFlow,
  stageChoicesOf,
  stageNeedsRating,
  stageOptionsOf,
  sortByOrder,
  type PipelineStatusOption,
} from '@/features/leads/addNoteLogic';
import {
  addLeadNote,
  noteChannelsQuery,
  updateLead,
  updateLeadPriority,
} from '@/features/leads/leadsApi';
import { patchLeadInLists } from '@/features/leads/leadDetailCache';
import { iconForStageName } from '@/features/leads/leadPipeline';
import {
  PRIORITIES,
  PRIORITY_META,
  normalizeLeadTemperature,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
import {
  radii,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@/theme';
import type { LeadDetail, LeadPriority } from '@/types/api';
import { formatPhoneDisplay } from '@/utils/phone';

type Props = {
  visible: boolean;
  lead: LeadDetail;
  statuses: PipelineStatusOption[];
  accountId?: string;
  initialStageId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

const PRIORITY_ICON = {
  COLD: ArrowDownDoubleIcon,
  WARM: MinusSignIcon,
  HOT: FlameIcon,
} as const;

export function AddNoteSheet({
  visible,
  lead,
  statuses,
  accountId,
  initialStageId,
  onClose,
  onSaved,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const queryClient = useQueryClient();
  const channelsQuery = useQuery({
    ...noteChannelsQuery,
    enabled: visible,
  });

  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [visitPick, setVisitPick] = useState<string | undefined>();
  const [channelId, setChannelId] = useState<number | null>(null);
  const [rating, setRating] = useState<LeadPriority | null>(null);
  const [followupAt, setFollowupAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [clips, setClips] = useState<VoiceClip[]>([]);
  const [recording, setRecording] = useState(false);
  const versionRef = useRef<number | undefined>(undefined);

  const channels = useMemo(
    () => composerChannels(channelsQuery.data),
    [channelsQuery.data]
  );

  const leadStatusId = lead.leadStatus?.id ?? null;
  const { choices, coldCalling } = useMemo(
    () => stageChoicesOf(statuses, leadStatusId),
    [statuses, leadStatusId]
  );

  const target =
    sortByOrder(choices.filter((s) => picked.includes(s.id))).pop() ?? null;
  const via =
    coldCalling &&
    target &&
    target.id !== coldCalling.id &&
    picked.includes(coldCalling.id)
      ? coldCalling
      : null;
  const isLost = isLostStageName(target);
  const isWon = isWonStageName(target);
  const terminal = isLost || isWon;

  const ownVisitOptions = stageOptionsOf(target);
  const visitOptions =
    target && (isVisitInterest(target) || isVisited(target))
      ? ownVisitOptions.length || !isVisitInterest(target)
        ? ownVisitOptions
        : stageOptionsOf(statuses.find(isVisited))
      : [];
  const followupRequired = isVisitInterest(target);

  useEffect(() => {
    if (!visible) return;
    setSuccessOpen(false);
    setNote('');
    setVisitPick(undefined);
    setChannelId(null);
    setFollowupAt(null);
    setPriorityOpen(false);
    setClips([]);
    setRecording(false);
    setRating(
      normalizeLeadTemperature(lead.temperature ?? lead.priority),
    );
    versionRef.current = lead.version ?? undefined;
    const preset =
      initialStageId != null &&
      initialStageId !== coldCalling?.id &&
      choices.some((s) => s.id === initialStageId)
        ? [initialStageId]
        : [];
    setPicked([...(coldCalling ? [coldCalling.id] : []), ...preset]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const priorityMutation = useMutation({
    mutationFn: (next: LeadPriority) =>
      updateLeadPriority(
        lead.id,
        {
          priority: next,
          expectedVersion: versionRef.current,
        },
        { accountId }
      ),
    onMutate: (next) => {
      const prev = rating;
      const prevLists = queryClient
        .getQueriesData({ queryKey: ['leads'] })
        .concat(queryClient.getQueriesData({ queryKey: ['my-follow-ups'] }));
      setRating(next);
      setPriorityOpen(false);
      patchLeadInLists(queryClient, lead.id, { priority: next });
      return { prev, prevLists };
    },
    onSuccess: (updated) => {
      versionRef.current = updated?.version ?? versionRef.current;
      queryClient.setQueryData(['lead', lead.id], updated);
      if (updated) {
        patchLeadInLists(queryClient, lead.id, {
          priority: updated.priority ?? null,
          updatedAt: updated.updatedAt,
        });
      }
      onSaved?.();
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.prev !== undefined) setRating(ctx.prev);
      if (ctx?.prevLists) {
        for (const [key, data] of ctx.prevLists) {
          queryClient.setQueryData(key, data);
        }
      }
      Alert.alert('Could not update temperature');
    },
  });

  function toggleStage(s: PipelineStatusOption) {
    setVisitPick(undefined);
    setPicked((cur) => {
      if (coldCalling) {
        if (s.id === coldCalling.id) {
          return cur.length > 1
            ? [coldCalling.id]
            : cur.length
              ? []
              : [coldCalling.id];
        }
        return cur.includes(s.id)
          ? [coldCalling.id]
          : [coldCalling.id, s.id];
      }
      return cur.includes(s.id) ? [] : [s.id];
    });
  }

  const hasNote = !!note.trim() || clips.length > 0;
  const canSave =
    hasNote && (!followupRequired || !!followupAt) && !saving && !recording;

  async function handleSave() {
    if (!canSave) return;
    let noteText = note.trim();
    if (!noteText && clips.length === 0) {
      Alert.alert('Write a note');
      return;
    }
    if (followupAt && followupAt.getTime() <= Date.now()) {
      Alert.alert('Pick a time in the future');
      return;
    }

    setSaving(true);
    let moved = false;
    try {
      // Upload voice clips first — append markdown links like web NoteComposer.
      noteText = await appendClipLinks(noteText, clips, { accountId });
      if (!noteText) {
        Alert.alert('Write a note');
        return;
      }

      const stageOption =
        visitPick === BOTH
          ? visitOptions.join(' + ') || undefined
          : visitPick;
      const steps = target ? [...(via ? [via] : []), target] : [];
      let fromId = leadStatusId;

      for (const step of steps) {
        const last = step.id === target!.id;
        const payload = buildStatusPayload({
          leadStatusId: step.id,
          currentStatusId: fromId,
          contactId: null,
          version: versionRef.current,
          stageRating: stageNeedsRating(step) ? rating : undefined,
          stageOption:
            last && ownVisitOptions.length ? stageOption : undefined,
          isWon: isWonStageName(step),
          isLost: isLostStageName(step),
          statusNote: last && !followupAt ? noteText : undefined,
          statusChannelId:
            last && !followupAt && channelId != null ? channelId : undefined,
        });
        if (!payload) continue;
        const updated = await updateLead(lead.id, payload, { accountId });
        versionRef.current = updated?.version ?? versionRef.current;
        queryClient.setQueryData(['lead', lead.id], updated);
        fromId = step.id;
        moved = true;
      }

      if (!moved || followupAt) {
        const payload: {
          note: string;
          channelId?: number;
          followupAt?: string;
          followupDate?: string;
          followupType?: string;
        } = { note: noteText };
        if (channelId != null) payload.channelId = channelId;
        if (followupAt) {
          const followupType = followupTypeOf(target, stageOption);
          const typeLabel =
            followupType === 'OFFICE_VISIT'
              ? 'Office visit'
              : followupType === 'SITE_VISIT'
                ? 'Site visit'
                : 'Follow-up';
          const flow = serializeActivityFlow([
            {
              title: 'Next Follow-up',
              detail: typeLabel,
              lines: [`Scheduled for: ${formatFollowupDisplay(followupAt)}`],
            },
          ]);
          payload.note = flow ? `${noteText}\n\n${flow}` : noteText;
          payload.followupDate = formatFollowupDateOnly(followupAt);
          payload.followupAt = followupAt.toISOString();
          payload.followupType = followupType;
        }
        await addLeadNote(lead.id, payload, { accountId });
      }

      void queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      onSaved?.();
      setSuccessOpen(true);
    } catch (err) {
      if (moved) {
        void queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
        onSaved?.();
      }
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const name = lead.buyerPersona?.fullName?.trim() || `Lead #${lead.id}`;
  const phone = lead.buyerPersona?.phone;
  const priorityMeta = rating ? PRIORITY_META[rating] : null;
  const priorityBadge = rating
    ? priorityBadgeColors(rating, isDark)
    : null;

  return (
    <>
    <Modal
      visible={visible && !successOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <HugeiconsIcon
                icon={UserIcon}
                size={20}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
            </View>
            <View style={styles.headerMain}>
              <Text style={styles.headerName} numberOfLines={1}>
                {name}
              </Text>
              {phone ? (
                <Text style={styles.headerPhone} numberOfLines={1}>
                  {formatPhoneDisplay(phone)}
                </Text>
              ) : null}
            </View>
            <View style={styles.priorityWrap}>
              <Pressable
                onPress={() => setPriorityOpen((o) => !o)}
                style={[
                  styles.priorityChip,
                  priorityBadge
                    ? {
                        backgroundColor: priorityBadge.backgroundColor,
                        borderColor: priorityBadge.borderColor,
                      }
                    : {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                ]}
              >
                {rating ? (
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[rating]}
                    size={13}
                    color={priorityBadge!.color}
                    strokeWidth={1.5}
                  />
                ) : null}
                <Text
                  style={[
                    styles.priorityText,
                    { color: priorityBadge?.color ?? colors.textMuted },
                  ]}
                >
                  {priorityMeta?.label ?? 'Temperature'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={priorityBadge?.color ?? colors.textMuted}
                />
              </Pressable>
              {priorityOpen ? (
                <View style={styles.priorityMenu}>
                  {PRIORITIES.map((p) => {
                    const opt = priorityBadgeColors(p, isDark);
                    const selected = p === rating;
                    return (
                      <Pressable
                        key={p}
                        style={[
                          styles.priorityOption,
                          selected && {
                            backgroundColor: opt.backgroundColor,
                            borderColor: opt.borderColor,
                          },
                        ]}
                        onPress={() => priorityMutation.mutate(p)}
                      >
                        <HugeiconsIcon
                          icon={PRIORITY_ICON[p]}
                          size={14}
                          color={opt.color}
                          strokeWidth={1.5}
                        />
                        <Text
                          style={{
                            color: opt.color,
                            fontWeight: '700',
                            fontSize: 12,
                            flex: 1,
                          }}
                        >
                          {PRIORITY_META[p].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {priorityOpen ? (
            <Pressable
              style={styles.priorityDismiss}
              onPress={() => setPriorityOpen(false)}
            />
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {choices.length > 0 ? (
              <View style={styles.pillRow}>
                {choices.map((s) => {
                  const active = picked.includes(s.id);
                  const label = isVisitInterest(s)
                    ? 'Visit Interest'
                    : s.name;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => toggleStage(s)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <HugeiconsIcon
                        icon={iconForStageName(String(s.name ?? ''))}
                        size={16}
                        color={active ? colors.brand : colors.text}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.pillLabel,
                          active && { color: colors.brand },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {visitOptions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Visit type (optional)</Text>
                <View style={styles.pillRow}>
                  {[
                    ...visitOptions.map((o) => ({ value: o, label: o })),
                    ...(visitOptions.length > 1
                      ? [{ value: BOTH, label: 'Both' }]
                      : []),
                  ].map((o) => {
                    const active = visitPick === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() =>
                          setVisitPick((cur) =>
                            cur === o.value ? undefined : o.value
                          )
                        }
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text
                          style={[
                            styles.pillLabel,
                            active && { color: colors.brand },
                          ]}
                        >
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <NoteComposer
              note={note}
              onChangeNote={setNote}
              clips={clips}
              onChangeClips={setClips}
              channels={channels}
              channelId={channelId}
              onChangeChannel={setChannelId}
              onRecordingChange={setRecording}
            />

            {!terminal ? (
              <FollowupDateTimeField
                label={
                  followupRequired
                    ? 'Followup Date'
                    : 'Followup Date (optional)'
                }
                value={followupAt}
                onChange={setFollowupAt}
              />
            ) : null}
          </ScrollView>

          <Pressable
            disabled={!canSave}
            onPress={() => void handleSave()}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>

    </Modal>

    <SuccessSheet
      open={successOpen}
      title="Successful"
      message="Your note has been added successfully."
      buttonLabel="Back to lead"
      onClose={() => {
        setSuccessOpen(false);
        onClose();
      }}
    />
    </>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '92%',
      paddingTop: spacing.md,
      overflow: 'visible',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 30,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerMain: { flex: 1, minWidth: 0 },
    headerName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    headerPhone: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    priorityWrap: {
      position: 'relative',
      zIndex: 40,
    },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    priorityText: { fontSize: 12, fontWeight: '700' },
    priorityMenu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 6,
      minWidth: 148,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
      gap: 2,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.45 : 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      zIndex: 50,
    },
    priorityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    priorityDismiss: {
      ...StyleSheet.absoluteFill,
      zIndex: 20,
    },
    closeBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xl,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
    pillLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    section: { gap: 8 },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '600',
    },
    saveBtn: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
