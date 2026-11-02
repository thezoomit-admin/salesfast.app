import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { LeadBuyerProfilePanel } from '@/components/leads/LeadBuyerProfilePanel';
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
import { LeadRequirementsPanel } from '@/components/leads/LeadRequirementsPanel';
import { LeadViewHistoryPanel } from '@/components/leads/LeadViewHistoryPanel';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LeadDetailSkeleton } from '@/components/ui/skeletons';
import {
  EmptyState,
  ErrorState,
  QueryPlaceholder,
} from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchLeadById,
  leadMetaQuery,
  leadStatusesQuery,
  noteChannelsQuery,
  startLeadView,
} from '@/features/leads/leadsApi';
import {
  formatMoney,
  summarizeLead,
} from '@/features/leads/leadSummary';
import {
  ADD_NOTE_MUTATION,
  leadWriteScope,
  newLeadWrite,
  onWriteQueued,
  UPDATE_STATUS_MUTATION,
  type AddNoteVars,
  type UpdateStatusVars,
} from '@/features/leads/leadWrites';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatDateTime } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer, openWhatsApp } from '@/utils/phone';

type NoteForm = { note: string; followupAt?: string };
type MainTab = 'overview' | 'history' | 'calls' | 'views';
type OverviewView = 'profile' | 'requirements';

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'history', label: 'History' },
  { key: 'calls', label: 'Call History' },
  { key: 'views', label: 'View History' },
];

const OVERVIEW_PILLS: { key: OverviewView; label: string }[] = [
  { key: 'profile', label: 'Buyer Profile' },
  { key: 'requirements', label: 'Requirements' },
];

const noteResolver = formResolver<NoteForm>((v) => ({
  note: minLength(v.note, 1, 'Note is required'),
}));

export default function LeadDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const accountId = useAuth().user?.id ?? '';
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [overviewView, setOverviewView] = useState<OverviewView>('profile');

  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });
  const statusesQuery = useQuery(leadStatusesQuery);
  const channelsQuery = useQuery(noteChannelsQuery);
  const metaQuery = useQuery(leadMetaQuery);

  // Match web portal: every visit lands in View History.
  useEffect(() => {
    if (!Number.isFinite(leadId)) return;
    void startLeadView(leadId)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['lead-views', leadId] })
      )
      .catch(() => {
        // Best effort — never block the screen.
      });
  }, [leadId, queryClient]);

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
  const statusMutation = useMutation<unknown, Error, UpdateStatusVars>({
    mutationKey: UPDATE_STATUS_MUTATION,
    scope,
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

  const changeStatus = (leadStatusId: number) => {
    const write: UpdateStatusVars = {
      ...newLeadWrite(accountId, leadId),
      leadStatusId,
      expectedVersion: leadQuery.data?.version,
    };
    onWriteQueued(queryClient, write.clientId, () => setStatusOpen(false));
    statusMutation.mutate(write, { onSuccess: () => setStatusOpen(false) });
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

  if (!leadQuery.data) {
    return (
      <Screen header={<ScreenHeader title="Lead" />}>
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
  const meta = metaQuery.data;
  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const sm = summarizeLead(lead, meta);

  const budgetLabel =
    sm.budgetMin != null || sm.budgetMax != null
      ? `${formatMoney(sm.budgetMin) ?? '—'} – ${formatMoney(sm.budgetMax) ?? '—'}`
      : null;

  const prefChips = [
    { key: 'type', label: 'Type', value: sm.propertyType },
    { key: 'loc', label: 'Location', value: sm.location },
    { key: 'size', label: 'Size', value: sm.size },
    { key: 'fin', label: 'Financing', value: sm.financing },
    { key: 'time', label: 'Timeline', value: sm.timeline },
  ].filter((c) => c.value);

  const followUp =
    lead.pendingFollowUp?.dueAt ?? lead.nextFollowupDate ?? null;

  return (
    <Screen
      header={<ScreenHeader title={name} />}
      scroll
      refreshing={leadQuery.isRefetching}
      onRefresh={() => leadQuery.refetch()}
    >
      <View style={styles.summaryCard}>
        <View style={styles.summaryHero}>
          <Text style={styles.name}>{name}</Text>
          {sm.occupation ? (
            <Text style={styles.occupation}>{sm.occupation}</Text>
          ) : null}
          <Text style={styles.phone}>{formatPhoneDisplay(phone)}</Text>
          <Text style={styles.status}>
            {lead.leadStatus?.name || 'No status'}
            {lead.assignedToName ? ` · ${lead.assignedToName}` : ''}
          </Text>
          {pendingStatusName ? (
            <Text style={styles.pendingText}>
              Changing to {pendingStatusName} · waiting to sync
            </Text>
          ) : null}
        </View>

        <View style={styles.budgetStrip}>
          <Text style={styles.budgetLabel}>Budget range</Text>
          <Text style={styles.budgetValue}>
            {budgetLabel ?? 'Not set yet'}
          </Text>
          {followUp ? (
            <Text style={styles.followUpHint}>
              Next follow-up · {formatDateTime(followUp)}
            </Text>
          ) : null}
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

      <View style={styles.actions}>
        <Button
          title="Call"
          style={{ flex: 1 }}
          onPress={async () => {
            const ok = await openPhoneDialer(phone);
            if (!ok) Alert.alert('Unable to dial', 'No phone number available.');
          }}
        />
        <Button
          title="WhatsApp"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={async () => {
            try {
              await openWhatsApp(whatsapp);
            } catch {
              Alert.alert('Unable to open WhatsApp');
            }
          }}
        />
      </View>
      <View style={styles.actions}>
        <Button
          title="Add note"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => setNoteOpen(true)}
        />
        <Button
          title="Status"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => setStatusOpen(true)}
        />
      </View>

      {/* Main tabs — same as web portal */}
      <View style={styles.tabShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {MAIN_TABS.map((tab) => (
            <FilterChip
              key={tab.key}
              label={tab.label}
              active={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </ScrollView>

        <View style={styles.tabBody}>
          {activeTab === 'overview' ? (
            <View style={styles.overviewWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subTabRow}
              >
                {OVERVIEW_PILLS.map((p) => (
                  <FilterChip
                    key={p.key}
                    label={p.label}
                    active={overviewView === p.key}
                    onPress={() => setOverviewView(p.key)}
                  />
                ))}
              </ScrollView>
              {overviewView === 'profile' ? (
                <LeadBuyerProfilePanel lead={lead} meta={meta} />
              ) : (
                <LeadRequirementsPanel lead={lead} meta={meta} />
              )}
            </View>
          ) : null}

          {activeTab === 'history' ? (
            <View style={styles.notesWrap}>
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

          {activeTab === 'calls' ? <LeadCallHistoryPanel lead={lead} /> : null}

          {activeTab === 'views' ? (
            Number.isFinite(leadId) ? (
              <LeadViewHistoryPanel leadId={leadId} />
            ) : (
              <EmptyState title="Unavailable" message="Lead id is missing." />
            )
          ) : null}
        </View>
      </View>

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

      <Modal visible={statusOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update status</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {(statusesQuery.data ?? []).map((status) => (
                <Pressable
                  key={status.id}
                  style={styles.statusRow}
                  disabled={statusMutation.isPending}
                  onPress={() => changeStatus(status.id)}
                >
                  <Text style={styles.statusRowText}>{status.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setStatusOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    summaryHero: {
      gap: spacing.xs,
      padding: spacing.lg,
      backgroundColor: colors.primary50,
    },
    name: { ...typography.title, color: colors.text },
    occupation: { ...typography.body, color: colors.textSecondary },
    phone: { ...typography.subtitle, color: colors.brand },
    status: { ...typography.body, color: colors.textSecondary },
    budgetStrip: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.primary50,
      borderWidth: 1,
      borderColor: colors.brandSoft,
      gap: 4,
    },
    budgetLabel: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    budgetValue: { ...typography.subtitle, color: colors.text },
    followUpHint: { ...typography.caption, color: colors.textSecondary },
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
    actions: { flexDirection: 'row', gap: spacing.sm },
    tabShell: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    tabRow: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: 'center',
    },
    subTabRow: {
      gap: spacing.sm,
      alignItems: 'center',
      paddingBottom: spacing.sm,
    },
    tabBody: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      minHeight: 160,
    },
    overviewWrap: { gap: spacing.md },
    notesWrap: { gap: spacing.sm },
    pendingNote: {
      borderWidth: 1,
      borderColor: colors.warningSoft,
      borderRadius: 12,
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
    modalTitle: { ...typography.subtitle, color: colors.text },
    statusRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statusRowText: { ...typography.body, color: colors.text },
  });
}
