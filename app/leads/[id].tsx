import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { TextField } from '@/components/ui/TextField';
import {
  addLeadNote,
  fetchLeadById,
  fetchLeadStatuses,
  fetchNoteChannels,
  updateLeadStatus,
} from '@/features/leads/leadsApi';
import { colors, radii, spacing, typography } from '@/theme';
import { formatDateTime } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer, openWhatsApp } from '@/utils/phone';

const noteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  followupAt: z.string().optional(),
});

type NoteForm = z.infer<typeof noteSchema>;

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const leadQuery = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadById(leadId),
    enabled: Number.isFinite(leadId),
  });
  const statusesQuery = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: fetchLeadStatuses,
  });
  const channelsQuery = useQuery({
    queryKey: ['note-channels'],
    queryFn: fetchNoteChannels,
  });

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
    resolver: zodResolver(noteSchema),
    defaultValues: { note: '', followupAt: '' },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
      queryClient.invalidateQueries({ queryKey: ['my-leads'] }),
      queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['follow-up-leads'] }),
    ]);
  };

  const noteMutation = useMutation({
    mutationFn: (values: NoteForm) =>
      addLeadNote(leadId, {
        note: values.note.trim(),
        channelId: callChannelId,
        followupAt: values.followupAt?.trim() || undefined,
      }),
    onSuccess: async () => {
      setNoteOpen(false);
      reset();
      await invalidate();
      Alert.alert('Saved', 'Note added successfully.');
    },
    onError: (error) => {
      Alert.alert('Could not save note', getErrorMessage(error));
    },
  });

  const statusMutation = useMutation({
    mutationFn: (leadStatusId: number) =>
      updateLeadStatus(leadId, {
        leadStatusId,
        expectedVersion: leadQuery.data?.version,
      }),
    onSuccess: async () => {
      setStatusOpen(false);
      await invalidate();
    },
    onError: (error) => {
      Alert.alert('Could not update status', getErrorMessage(error));
    },
  });

  if (leadQuery.isLoading) {
    return (
      <Screen header={<ScreenHeader title="Lead" />}>
        <LoadingState />
      </Screen>
    );
  }

  if (leadQuery.isError || !leadQuery.data) {
    return (
      <Screen header={<ScreenHeader title="Lead" />}>
        <ErrorState
          message={getErrorMessage(leadQuery.error, 'Lead not found')}
          onRetry={() => leadQuery.refetch()}
        />
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
        {!lead.notes?.length ? (
          <EmptyState title="No notes yet" message="Add the first note for this lead." />
        ) : (
          lead.notes.map((note) => (
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
              onPress={handleSubmit((values) => noteMutation.mutate(values))}
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
                  onPress={() => statusMutation.mutate(status.id)}
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
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
