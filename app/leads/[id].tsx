import Ionicons from '@expo/vector-icons/Ionicons';
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
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import {
  LeadDetailTabBar,
  type LeadDetailTab,
} from '@/components/leads/LeadDetailTabBar';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
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
import { useLeadDetail } from '@/features/leads/useLeadDetail';
import {
  radii,
  spacing,
  typography,
  useTheme,
  useThemeColors,
  type ThemeColors,
} from '@/theme';
import { formatDateTime } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer, openWhatsApp } from '@/utils/phone';

type NoteForm = { note: string; followupAt?: string };

const noteResolver = formResolver<NoteForm>((v) => ({
  note: minLength(v.note, 1, 'Note is required'),
}));

export default function LeadDetailScreen() {
  const colors = useThemeColors();
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const accountId = useAuth().user?.id ?? '';
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
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

  const headerTitle =
    leadQuery.data?.buyerPersona?.fullName?.trim() ||
    (Number.isFinite(leadId) ? `Lead #${leadId}` : 'Lead');

  const headerRight = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add note"
      hitSlop={8}
      onPress={() => setNoteOpen(true)}
      style={({ pressed }) => [
        styles.headerNoteBtn,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="create-outline" size={16} color={colors.white} />
      <Text style={styles.headerNoteText}>Add note</Text>
    </Pressable>
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
  const statusColor = lead.leadStatus?.color || colors.brand;
  const currentStatusId = lead.leadStatus?.id ?? null;

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
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change status"
                onPress={() => setStatusOpen(true)}
                style={({ pressed }) => [
                  styles.statusChip,
                  { backgroundColor: statusColor },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.statusChipText} numberOfLines={1}>
                  {lead.leadStatus?.name || 'Status'}
                </Text>
                <Ionicons name="chevron-down" size={11} color="#fff" />
              </Pressable>
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
                  size={18}
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
                  size={18}
                  color={whatsapp ? '#25D366' : colors.textMuted}
                />
              </Pressable>
            </View>

            {phone || lead.leadSource?.name ? (
              <Text style={styles.subLine} numberOfLines={1}>
                {[
                  phone || whatsapp
                    ? formatPhoneDisplay(phone || whatsapp)
                    : null,
                  lead.leadSource?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}

            {sm.occupation ? (
              <Text style={styles.occupation}>{sm.occupation}</Text>
            ) : null}
            {lead.assignedToName ? (
              <Text style={styles.metaLine}>
                Assignee · {lead.assignedToName}
              </Text>
            ) : null}
            {lead.buyerPersona?.email ? (
              <Text style={styles.metaLine}>{lead.buyerPersona.email}</Text>
            ) : null}
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

      <Modal visible={statusOpen} animationType="fade" transparent>
        <Pressable
          style={styles.dropdownBackdrop}
          onPress={() => setStatusOpen(false)}
        >
          <Pressable
            style={styles.dropdownCard}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Text style={styles.modalTitle}>Status</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(statusesQuery.data ?? []).map((status) => {
                const selected = status.id === currentStatusId;
                const tone = stageBadgeStyle(
                  status.color || colors.brand,
                  isDark
                );
                return (
                  <Pressable
                    key={status.id}
                    style={[
                      styles.statusOption,
                      selected && {
                        backgroundColor: tone.backgroundColor,
                        borderColor: tone.borderColor,
                      },
                    ]}
                    disabled={statusMutation.isPending || selected}
                    onPress={() => changeStatus(status.id)}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: status.color || colors.brand },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        selected && { color: tone.color, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {status.name}
                    </Text>
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={tone.color}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  if (full.length !== 6) return null;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(r: number, g: number, b: number): string {
  const h = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function mix(
  hex: string,
  target: { r: number; g: number; b: number },
  amount: number
): string {
  const rgb = parseRgb(hex);
  if (!rgb) return hex;
  return toHex(
    rgb.r + (target.r - rgb.r) * amount,
    rgb.g + (target.g - rgb.g) * amount,
    rgb.b + (target.b - rgb.b) * amount
  );
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

function stageBadgeStyle(statusColor: string, isDark: boolean) {
  if (!isDark) {
    return {
      backgroundColor: mix(statusColor, WHITE, 0.86),
      borderColor: mix(statusColor, WHITE, 0.72),
      color: mix(statusColor, BLACK, 0.12),
    };
  }
  return {
    backgroundColor: mix(statusColor, BLACK, 0.72),
    borderColor: mix(statusColor, BLACK, 0.5),
    color: mix(statusColor, WHITE, 0.38),
  };
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerNoteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
    },
    headerNoteText: {
      ...typography.caption,
      color: colors.white,
      fontWeight: '700',
      fontSize: 13,
    },
    pressed: { opacity: 0.85 },
    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    summaryHero: {
      gap: spacing.sm,
      padding: spacing.lg,
      backgroundColor: colors.primary50,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },
    name: {
      ...typography.subtitle,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
      minWidth: 0,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
      maxWidth: 120,
      flexShrink: 0,
    },
    statusChipText: {
      ...typography.caption,
      color: '#fff',
      fontWeight: '700',
      fontSize: 11,
      maxWidth: 90,
    },
    inlineAction: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    actionFaded: { opacity: 0.4 },
    subLine: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    occupation: { ...typography.body, color: colors.textSecondary },
    metaLine: { ...typography.caption, color: colors.textMuted },
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
      gap: spacing.sm,
      maxHeight: '70%',
    },
    modalTitle: { ...typography.subtitle, color: colors.text },
    statusOption: {
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
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    statusOptionText: {
      ...typography.body,
      color: colors.text,
      flex: 1,
      fontWeight: '600',
      fontSize: 13,
    },
  });
}
