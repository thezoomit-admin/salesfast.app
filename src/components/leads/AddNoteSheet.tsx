import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import {
  BOTH,
  NOTE_CHANNELS,
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
import { iconForStageName } from '@/features/leads/leadPipeline';
import {
  PRIORITIES,
  PRIORITY_META,
} from '@/features/leads/leadPriority';
import {
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import type { LeadDetail, LeadPriority } from '@/types/api';
import { formatPhoneDisplay } from '@/utils/phone';

type Props = {
  visible: boolean;
  lead: LeadDetail;
  statuses: PipelineStatusOption[];
  accountId?: string;
  /** Pre-select a pipeline stage (from stepper tap). */
  initialStageId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
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
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [saving, setSaving] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const versionRef = useRef<number | undefined>(undefined);

  const channels = useMemo(() => {
    const all = channelsQuery.data ?? [];
    return NOTE_CHANNELS.flatMap(({ label, match }) => {
      const c = all.find((ch) => match.test(String(ch.name ?? '').trim()));
      return c ? [{ id: c.id, name: c.name, label }] : [];
    });
  }, [channelsQuery.data]);

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
    setNote('');
    setVisitPick(undefined);
    setChannelId(null);
    setFollowupAt(null);
    setShowPicker(false);
    setPriorityOpen(false);
    setRating((lead.priority as LeadPriority | null) ?? null);
    versionRef.current = lead.version ?? undefined;
    const preset =
      initialStageId != null &&
      initialStageId !== coldCalling?.id &&
      choices.some((s) => s.id === initialStageId)
        ? [initialStageId]
        : [];
    setPicked([...(coldCalling ? [coldCalling.id] : []), ...preset]);
    // Reset only when the sheet opens.
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
      setRating(next);
      setPriorityOpen(false);
      return { prev };
    },
    onSuccess: (updated) => {
      versionRef.current = updated?.version ?? versionRef.current;
      queryClient.setQueryData(['lead', lead.id], updated);
      onSaved?.();
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.prev !== undefined) setRating(ctx.prev);
      Alert.alert('Could not update priority');
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

  const hasNote = !!note.trim();
  const canSave =
    hasNote &&
    (!followupRequired || !!followupAt) &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    const noteText = note.trim();
    if (!noteText) {
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
      void queryClient.invalidateQueries({ queryKey: ['my-leads'] });
      onClose();
      onSaved?.();
      Alert.alert('Saved', 'Note added successfully.');
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

  function openFollowupPicker() {
    setPickerMode('date');
    setShowPicker(true);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (!date) return;
    if (pickerMode === 'date') {
      const next = followupAt ? new Date(followupAt) : new Date();
      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      if (!followupAt) {
        next.setHours(10, 0, 0, 0);
      }
      setFollowupAt(next);
      if (Platform.OS === 'android') {
        setPickerMode('time');
        setTimeout(() => setShowPicker(true), 50);
      } else {
        setPickerMode('time');
      }
      return;
    }
    const next = followupAt ? new Date(followupAt) : new Date();
    next.setHours(date.getHours(), date.getMinutes(), 0, 0);
    setFollowupAt(next);
    setShowPicker(false);
    setPickerMode('date');
  }

  const name = lead.buyerPersona?.fullName?.trim() || `Lead #${lead.id}`;
  const phone = lead.buyerPersona?.phone;
  const priorityMeta = rating ? PRIORITY_META[rating] : null;

  return (
    <Modal
      visible={visible}
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
          {/* Header — same as web */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <HugeiconsIcon
                icon={UserIcon}
                size={20}
                color="#667085"
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
            <Pressable
              onPress={() => setPriorityOpen(true)}
              style={[
                styles.priorityChip,
                priorityMeta
                  ? {
                      backgroundColor: priorityMeta.bg,
                      borderColor: priorityMeta.border,
                    }
                  : {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
              ]}
            >
              {rating ? (
                <HugeiconsIcon
                  icon={PRIORITY_ICON[rating]}
                  size={13}
                  color={priorityMeta!.color}
                  strokeWidth={1.5}
                />
              ) : null}
              <Text
                style={[
                  styles.priorityText,
                  { color: priorityMeta?.color ?? colors.textMuted },
                ]}
              >
                {priorityMeta?.label ?? 'Priority'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

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
                      style={[
                        styles.pill,
                        active && styles.pillActive,
                      ]}
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

            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a note…"
                placeholderTextColor={colors.textMuted}
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={5000}
                textAlignVertical="top"
              />
              {channels.length > 0 ? (
                <View style={styles.channelRow}>
                  {channels.map((c) => {
                    const active = channelId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() =>
                          setChannelId((cur) => (cur === c.id ? null : c.id))
                        }
                        style={[
                          styles.channelChip,
                          active && styles.channelChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.channelLabel,
                            active && { color: colors.brand },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            {!terminal ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {followupRequired
                    ? 'Followup Date'
                    : 'Followup Date (optional)'}
                </Text>
                <Pressable
                  onPress={openFollowupPicker}
                  style={styles.followupBtn}
                >
                  <Text
                    style={[
                      styles.followupText,
                      !followupAt && { color: colors.textMuted },
                    ]}
                  >
                    {followupAt
                      ? formatFollowupDisplay(followupAt)
                      : 'Pick date & time'}
                  </Text>
                  {followupAt ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => setFollowupAt(null)}
                    >
                      <Text style={styles.clearFollowup}>Clear</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              </View>
            ) : null}
          </ScrollView>

          {showPicker ? (
            <DateTimePicker
              value={followupAt ?? new Date()}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={onPickerChange}
            />
          ) : null}

          <Pressable
            disabled={!canSave}
            onPress={() => void handleSave()}
            style={[
              styles.saveBtn,
              !canSave && styles.saveBtnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>

      <Modal visible={priorityOpen} animationType="fade" transparent>
        <Pressable
          style={styles.priorityBackdrop}
          onPress={() => setPriorityOpen(false)}
        >
          <Pressable
            style={styles.priorityCard}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.priorityTitle}>Priority</Text>
            {PRIORITIES.map((p) => {
              const meta = PRIORITY_META[p];
              const selected = p === rating;
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.priorityOption,
                    selected && {
                      backgroundColor: meta.bg,
                      borderColor: meta.border,
                    },
                  ]}
                  onPress={() => priorityMutation.mutate(p)}
                >
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[p]}
                    size={16}
                    color={meta.color}
                    strokeWidth={1.5}
                  />
                  <Text style={{ color: meta.color, fontWeight: '700', flex: 1 }}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '92%',
      paddingTop: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: '#F2F4F7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerMain: { flex: 1, minWidth: 0 },
    headerName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#15202C',
    },
    headerPhone: {
      fontSize: 12,
      color: '#5B6B7A',
      marginTop: 1,
    },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    priorityText: { fontSize: 12, fontWeight: '700' },
    closeBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: { fontSize: 16, color: colors.textMuted },
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
      borderColor: '#DDDDDD',
      backgroundColor: '#fff',
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: colors.brand,
      backgroundColor: '#FFF4F0',
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
    noteBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    noteInput: {
      minHeight: 120,
      padding: spacing.md,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
    },
    channelRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
    },
    channelChip: {
      height: 28,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: '#E4E7EC',
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    channelChipActive: {
      borderColor: colors.brand,
      backgroundColor: '#FFF4F0',
    },
    channelLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#475467',
    },
    followupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    followupText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    clearFollowup: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.brand,
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
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    priorityBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    priorityCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: 4,
    },
    priorityTitle: {
      ...typography.subtitle,
      color: colors.text,
      marginBottom: 4,
    },
    priorityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: 'transparent',
      marginTop: 4,
    },
  });
}
