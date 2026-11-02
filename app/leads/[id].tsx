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
import { Button } from '@/components/ui/Button';
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
  leadStatusesQuery,
  noteChannelsQuery,
} from '@/features/leads/leadsApi';
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

  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });
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

  // How these writes run, retry, refresh the lists and report errors lives in
  // leadWrites (they can also finish after this screen is gone, or after a
  // restart). Online, the dialogs wait for the server as before; if a write
  // has to wait for the network it is queued and the dialog closes.
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
        if (queued) return; // the dialog already closed as "saved offline"
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
    // Queued: the header shows the pending status until it syncs.
    onWriteQueued(queryClient, write.clientId, () => setStatusOpen(false));
    statusMutation.mutate(write, { onSuccess: () => setStatusOpen(false) });
  };

  // Writes for this lead that have not reached the server yet (also ones
  // restored after a restart). Shown as such — never as confirmed data.
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

  // A cached copy renders immediately (also offline); fresh data follows.
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
  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;

  return (
    <Screen
      header={<ScreenHeader title={name} />}
      scroll
      refreshing={leadQuery.isRefetching}
      onRefresh={() => leadQuery.refetch()}
    >
      <View style={styles.hero}>
        <Text style={styles.name}>{name}</Text>
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
        <Button title="Add note" variant="secondary" style={{ flex: 1 }} onPress={() => setNoteOpen(true)} />
        <Button title="Status" variant="ghost" style={{ flex: 1 }} onPress={() => setStatusOpen(true)} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Details</Text>
        <DetailRow label="Email" value={lead.buyerPersona?.email || '—'} />
        <DetailRow label="Source" value={lead.leadSource?.name || '—'} />
        <DetailRow
          label="Locations"
          value={lead.preferredLocations?.join(', ') || '—'}
        />
        <DetailRow
          label="Property types"
          value={lead.propertyTypes?.join(', ') || '—'}
        />
        <DetailRow
          label="Budget"
          value={
            lead.budgetMin != null || lead.budgetMax != null
              ? `${lead.budgetMin ?? '—'} – ${lead.budgetMax ?? '—'}`
              : '—'
          }
        />
        <DetailRow
          label="Next follow-up"
          value={
            lead.pendingFollowUp?.dueAt
              ? formatDateTime(lead.pendingFollowUp.dueAt)
              : lead.nextFollowupDate
                ? formatDateTime(lead.nextFollowupDate)
                : '—'
          }
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Notes & timeline</Text>
        {pendingNotes.map((note) => (
          <View key={note.clientId} style={styles.note}>
            <Text style={styles.pendingText}>
              Waiting to sync · {formatDateTime(new Date(note.queuedAt))}
            </Text>
            <Text style={styles.noteBody}>{note.note}</Text>
          </View>
        ))}
        {!lead.notes?.length && !pendingNotes.length ? (
          <EmptyState title="No notes yet" message="Add the first note for this lead." />
        ) : (
          (lead.notes ?? []).map((note) => (
            <View key={note.id} style={styles.note}>
              <Text style={styles.noteMeta}>
                {note.channel?.name || 'Note'} · {note.addedByName || 'Agent'} ·{' '}
                {formatDateTime(note.createdAt)}
              </Text>
              <Text style={styles.noteBody}>{note.note}</Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={noteOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.panelTitle}>Add note</Text>
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
            <Button title="Cancel" variant="ghost" onPress={() => setNoteOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={statusOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.panelTitle}>Update status</Text>
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
            <Button title="Cancel" variant="ghost" onPress={() => setStatusOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    hero: { gap: spacing.xs },
    name: { ...typography.title, color: colors.text },
    phone: { ...typography.subtitle, color: colors.brand },
    status: { ...typography.body, color: colors.textSecondary },
    actions: { flexDirection: 'row', gap: spacing.sm },
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    panelTitle: { ...typography.subtitle, color: colors.text },
    detailRow: { gap: 2, paddingVertical: 4 },
    detailLabel: { ...typography.caption, color: colors.textMuted },
    detailValue: { ...typography.body, color: colors.text },
    note: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      gap: 4,
    },
    noteMeta: { ...typography.caption, color: colors.textMuted },
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
    statusRow: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    statusRowText: { ...typography.body, color: colors.text },
  });
}
