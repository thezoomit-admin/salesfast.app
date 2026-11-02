import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formResolver, minLength } from '@/lib/formResolver';

import { getErrorMessage } from '@/api/client';
import {
  ArrowDownDoubleIcon,
  FlameIcon,
  MinusSignIcon,
} from '@/components/icons/hugeicons';
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import {
  LeadDetailTabBar,
  type LeadDetailTab,
} from '@/components/leads/LeadDetailTabBar';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { LeadViewHistoryPanel } from '@/components/leads/LeadViewHistoryPanel';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import {
  HeaderAddButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import { LeadDetailSkeleton } from '@/components/ui/skeletons';
import {
  ErrorState,
  QueryPlaceholder,
} from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import {
  leadStatusesQuery,
  noteChannelsQuery,
  updateLeadPriority,
} from '@/features/leads/leadsApi';
import {
  PRIORITIES,
  PRIORITY_META,
} from '@/features/leads/leadPriority';
import { summarizeLead } from '@/features/leads/leadSummary';
import {
  ADD_NOTE_MUTATION,
  leadWriteScope,
  newLeadWrite,
  onWriteQueued,
  UPDATE_STATUS_MUTATION,
  type AddNoteVars,
  type UpdateStatusVars,
} from '@/features/leads/leadWrites';
import { useLeadDetail } from '@/features/leads/useLeadDetail';
import {
  radii,
  spacing,
  typography,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import type { LeadPriority } from '@/types/api';
import { formatDateTime } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer, openWhatsApp } from '@/utils/phone';

type NoteForm = { note: string; followupAt?: string };

const noteResolver = formResolver<NoteForm>((v) => ({
  note: minLength(v.note, 1, 'Note is required'),
}));

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

export default function LeadDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const accountId = useAuth().user?.id ?? '';
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>('overview');

  const { leadQuery, metaQuery } = useLeadDetail(leadId);
  const statusesQuery = useQuery(leadStatusesQuery);
  const channelsQuery = useQuery(noteChannelsQuery);

  const callChannelId = useMemo(
    () =>
      channelsQuery.data?.find((c) =>
        c.name.toLowerCase().includes('call')
      )?.id,
    [channelsQuery.data]
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteForm>({
    resolver: noteResolver,
    defaultValues: { note: '', followupAt: '' },
  });

  const scope = leadWriteScope(accountId);
  const noteMutation = useMutation<unknown, Error, AddNoteVars>({
    mutationKey: ADD_NOTE_MUTATION,
    scope,
  });
  const priorityMutation = useMutation({
    mutationFn: (priority: LeadPriority) =>
      updateLeadPriority(
        leadId,
        {
          priority,
          expectedVersion: leadQuery.data?.version,
        },
        { accountId }
      ),
    onMutate: async (priority) => {
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      const prev = leadQuery.data;
      if (prev) {
        queryClient.setQueryData(['lead', leadId], { ...prev, priority });
      }
      setPriorityOpen(false);
      return { prev };
    },
    onError: (_err, _p, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['lead', leadId], ctx.prev);
      Alert.alert('Could not update priority');
    },
    onSuccess: (updated) => {
      if (updated) queryClient.setQueryData(['lead', leadId], updated);
    },
  });

  const submitNote = (values: NoteForm) => {
    const write: AddNoteVars = {
      ...newLeadWrite(accountId, leadId),
      note: values.note.trim(),
      channelId: callChannelId,
      followupAt: values.followupAt?.trim() || undefined,
    };
    let queued = false;
    onWriteQueued(queryClient, write.clientId, () => {
      queued = true;
      setNoteOpen(false);
      reset();
      Alert.alert(
        'Saved offline',
        'This note will be sent automatically when you are back online.'
      );
    });
    noteMutation.mutate(write, {
      onSuccess: () => {
        if (queued) return;
        setNoteOpen(false);
        reset();
        Alert.alert('Saved', 'Note added successfully.');
      },
    });
  };

  const pendingNotes = useMutationState({
    filters: { mutationKey: ADD_NOTE_MUTATION, status: 'pending' },
    select: (m) => m.state.variables as AddNoteVars,
  }).filter((v) => v?.leadId === leadId);

  const pendingStatusId = useMutationState({
    filters: { mutationKey: UPDATE_STATUS_MUTATION, status: 'pending' },
    select: (m) => m.state.variables as UpdateStatusVars,
  })
    .filter((v) => v?.leadId === leadId)
    .at(-1)?.leadStatusId;
  const pendingStatusName =
    pendingStatusId != null
      ? (statusesQuery.data?.find((s) => s.id === pendingStatusId)?.name ??
        'New status')
      : null;

  const headerTitle =
    leadQuery.data?.buyerPersona?.fullName?.trim() ||
    (Number.isFinite(leadId) ? `Lead #${leadId}` : 'Lead');

  const headerRight = (
    <HeaderAddButton
      label="Add note"
      onPress={() => setNoteOpen(true)}
    />
  );

  if (!leadQuery.data) {
    return (
      <Screen
        header={<ScreenHeader title="Lead" right={headerRight} />}
        footer={
          <LeadDetailTabBar active={activeTab} onChange={setActiveTab} />
        }
      >
        {Number.isFinite(leadId) ? (
          <QueryPlaceholder
            query={leadQuery}
            errorMessage={getErrorMessage(leadQuery.error, 'Lead not found')}
            skeleton={<LeadDetailSkeleton />}
          />
        ) : (
          <ErrorState message="Lead not found" />
        )}
      </Screen>
    );
  }

  const lead = leadQuery.data;
  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const sm = summarizeLead(lead, metaQuery.data);
  const currentStatusId = lead.leadStatus?.id ?? null;
  const priority = (lead.priority ?? null) as LeadPriority | null;
  const priorityMeta = priority ? PRIORITY_META[priority] : null;

  const prefChips = [
    { key: 'type', label: 'Type', value: sm.propertyType },
    { key: 'loc', label: 'Location', value: sm.location },
    { key: 'size', label: 'Size', value: sm.size },
    { key: 'fin', label: 'Financing', value: sm.financing },
    { key: 'time', label: 'Timeline', value: sm.timeline },
  ].filter((c) => c.value);

  async function onCall() {
    const ok = await openPhoneDialer(phone);
    if (!ok) Alert.alert('Unable to dial', 'No phone number available.');
  }

  async function onWhatsApp() {
    try {
      const ok = await openWhatsApp(whatsapp);
      if (!ok) Alert.alert('Unable to open WhatsApp', 'No number available.');
    } catch {
      Alert.alert('Unable to open WhatsApp');
    }
  }

  return (
    <Screen
      header={<ScreenHeader title={headerTitle} right={headerRight} />}
      footer={
        <LeadDetailTabBar active={activeTab} onChange={setActiveTab} />
      }
      scroll
      refreshing={leadQuery.isRefetching}
      onRefresh={() => leadQuery.refetch()}
    >
      {activeTab === 'overview' ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHero}>
            {/* Row 1: Name + Priority */}
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change priority"
                onPress={() => setPriorityOpen(true)}
                style={({ pressed }) => [
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
                  pressed && styles.pressed,
                ]}
              >
                {priority ? (
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[priority]}
                    size={13}
                    color={priorityMeta!.color}
                    strokeWidth={1.5}
                  />
                ) : null}
                <Text
                  style={[
                    styles.priorityChipText,
                    { color: priorityMeta?.color ?? colors.textMuted },
                  ]}
                >
                  {priorityMeta?.label ?? 'Priority'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={11}
                  color={priorityMeta?.color ?? colors.textMuted}
                />
              </Pressable>
            </View>

            {/* Row 2: Number + Call + WhatsApp + Source */}
            <View style={styles.contactRow}>
              {phone || whatsapp ? (
                <Text style={styles.subLine} numberOfLines={1}>
                  {formatPhoneDisplay(phone || whatsapp)}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call"
                hitSlop={8}
                disabled={!phone}
                onPress={() => void onCall()}
                style={({ pressed }) => [
                  styles.inlineAction,
                  (pressed || !phone) && styles.actionFaded,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={17}
                  color={phone ? colors.textSecondary : colors.textMuted}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="WhatsApp"
                hitSlop={8}
                disabled={!whatsapp}
                onPress={() => void onWhatsApp()}
                style={({ pressed }) => [
                  styles.inlineAction,
                  (pressed || !whatsapp) && styles.actionFaded,
                ]}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={17}
                  color={whatsapp ? '#25D366' : colors.textMuted}
                />
              </Pressable>
              {lead.leadSource?.name ? (
                <Text style={styles.sourceText} numberOfLines={1}>
                  · {lead.leadSource.name}
                </Text>
              ) : null}
            </View>

            {/* Row 3: Assign BY */}
            <Text style={styles.assignLine} numberOfLines={1}>
              Assign BY- {lead.assignedToName?.trim() || '—'}
            </Text>

            {sm.occupation ? (
              <Text style={styles.occupation}>{sm.occupation}</Text>
            ) : null}
            {pendingStatusName ? (
              <Text style={styles.pendingText}>
                Changing to {pendingStatusName} · waiting to sync
              </Text>
            ) : null}
          </View>

          <View style={styles.pipelineBlock}>
            <LeadPipeline
              statuses={statusesQuery.data ?? []}
              currentStatusId={currentStatusId}
              assignedToName={lead.assignedToName}
              onStepPress={() => setNoteOpen(true)}
            />
          </View>

          {prefChips.length > 0 ? (
            <View style={styles.prefSection}>
              <Text style={styles.prefHeading}>Preferences</Text>
              <View style={styles.prefRow}>
                {prefChips.map((c) => (
                  <View key={c.key} style={styles.prefChip}>
                    <Text style={styles.prefChipLabel}>{c.label}</Text>
                    <Text style={styles.prefChipValue}>{c.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {activeTab === 'history' ? (
        <View style={styles.pageBlock}>
          <Text style={styles.pageTitle}>History</Text>
          {pendingNotes.map((note) => (
            <View key={note.clientId} style={styles.pendingNote}>
              <Text style={styles.pendingText}>
                Waiting to sync · {formatDateTime(new Date(note.queuedAt))}
              </Text>
              <Text style={styles.noteBody}>{note.note}</Text>
            </View>
          ))}
          <LeadHistoryPanel lead={lead} />
        </View>
      ) : null}

      {activeTab === 'calls' ? (
        <View style={styles.pageBlock}>
          <Text style={styles.pageTitle}>Call History</Text>
          <LeadCallHistoryPanel lead={lead} />
        </View>
      ) : null}

      {activeTab === 'views' ? (
        <View style={styles.pageBlock}>
          <Text style={styles.pageTitle}>View History</Text>
          <LeadViewHistoryPanel leadId={leadId} />
        </View>
      ) : null}

      <Modal visible={noteOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add note</Text>
            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Note"
                  multiline
                  style={{ minHeight: 100, textAlignVertical: 'top' }}
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.note?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="followupAt"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Follow-up (ISO datetime, optional)"
                  placeholder="2026-11-02T15:00:00"
                  autoCapitalize="none"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                />
              )}
            />
            <Button
              title="Save note"
              loading={noteMutation.isPending}
              onPress={handleSubmit(submitNote)}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setNoteOpen(false)}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={priorityOpen} animationType="fade" transparent>
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setPriorityOpen(false)}
        >
          <Pressable
            style={styles.dropdownCard}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.modalTitle}>Priority</Text>
            {PRIORITIES.map((p) => {
              const meta = PRIORITY_META[p];
              const selected = p === priority;
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
                  disabled={priorityMutation.isPending || selected}
                  onPress={() => priorityMutation.mutate(p)}
                >
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[p]}
                    size={16}
                    color={meta.color}
                    strokeWidth={1.5}
                  />
                  <Text style={[styles.priorityOptionText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={meta.color} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pressed: { opacity: 0.85 },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    summaryHero: {
      gap: 6,
      padding: spacing.lg,
      backgroundColor: colors.surface,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      flexWrap: 'wrap',
    },
    name: {
      ...typography.subtitle,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
      minWidth: 0,
    },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
      flexShrink: 0,
    },
    priorityChipText: {
      ...typography.caption,
      fontWeight: '700',
      fontSize: 12,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minWidth: 0,
      flexWrap: 'wrap',
    },
    subLine: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    sourceText: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
      flexShrink: 1,
    },
    inlineAction: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionFaded: { opacity: 0.4 },
    assignLine: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
    },
    occupation: { ...typography.body, color: colors.textSecondary },
    pipelineBlock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    prefSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    prefHeading: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    prefChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 2,
      maxWidth: '100%',
    },
    prefChipLabel: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      fontSize: 10,
    },
    prefChipValue: { ...typography.body, color: colors.text, fontWeight: '500' },
    pageBlock: { gap: spacing.md },
    pageTitle: { ...typography.subtitle, color: colors.text },
    pendingNote: {
      borderWidth: 1,
      borderColor: colors.warningSoft,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: 4,
      backgroundColor: colors.warningSoft,
    },
    pendingText: { ...typography.caption, color: colors.warning },
    noteBody: { ...typography.body, color: colors.textSecondary },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.xl,
      gap: spacing.md,
    },
    dropdownBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    dropdownCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 4,
      maxHeight: '70%',
    },
    modalTitle: { ...typography.subtitle, color: colors.text, marginBottom: 4 },
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
    priorityOptionText: {
      ...typography.body,
      flex: 1,
      fontWeight: '700',
      fontSize: 13,
    },
  });
}
