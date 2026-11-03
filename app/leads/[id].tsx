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
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  ArrowDownDoubleIcon,
  FlameIcon,
  MinusSignIcon,
} from '@/components/icons/hugeicons';
import { AddNoteSheet } from '@/components/leads/AddNoteSheet';
import { LeadBuyerProfilePanel } from '@/components/leads/LeadBuyerProfilePanel';
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import { LeadFollowupCard } from '@/components/leads/LeadFollowupCard';
import {
  LeadDetailTabBar,
  type LeadDetailTab,
} from '@/components/leads/LeadDetailTabBar';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { LeadRequirementsPanel } from '@/components/leads/LeadRequirementsPanel';
import { LeadSectionShell } from '@/components/leads/LeadSectionShell';
import { LeadViewHistoryPanel } from '@/components/leads/LeadViewHistoryPanel';
import { Screen } from '@/components/ui/Screen';
import {
  HeaderAddButton,
  ScreenHeader,
} from '@/components/ui/ScreenHeader';
import {
  LeadDetailSkeleton,
  LeadSectionSkeleton,
} from '@/components/ui/skeletons';
import {
  ErrorState,
  QueryPlaceholder,
} from '@/components/ui/StateViews';
import { useAuth } from '@/features/auth/AuthContext';
import {
  findListLead,
  patchLeadInLists,
} from '@/features/leads/leadDetailCache';
import {
  leadStatusesQuery,
  updateLeadPriority,
} from '@/features/leads/leadsApi';
import {
  PRIORITIES,
  PRIORITY_META,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
import { summarizeLead } from '@/features/leads/leadSummary';
import {
  ADD_NOTE_MUTATION,
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
  type ThemeColors,
} from '@/theme';
import type { LeadPriority } from '@/types/api';
import { formatDateTime } from '@/utils/dates';
import { formatPhoneDisplay, openPhoneDialer, openWhatsApp } from '@/utils/phone';

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

export default function LeadDetailScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const accountId = useAuth().user?.id ?? '';
  const queryClient = useQueryClient();
  const [noteOpen, setNoteOpen] = useState(false);
  // The sheet (audio recorder, channel list) mounts on first use, not with
  // every lead opened.
  const [noteMounted, setNoteMounted] = useState(false);
  const [noteStageId, setNoteStageId] = useState<number | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeadDetailTab>('overview');
  const [overviewPill, setOverviewPill] = useState<'profile' | 'requirements'>(
    'profile'
  );

  const { leadQuery, metaQuery } = useLeadDetail(leadId);
  const statusesQuery = useQuery(leadStatusesQuery);

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
      const prevDetail = leadQuery.data;
      const prevLists = queryClient.getQueriesData({ queryKey: ['my-leads'] })
        .concat(queryClient.getQueriesData({ queryKey: ['follow-up-leads'] }));
      if (prevDetail) {
        queryClient.setQueryData(['lead', leadId], { ...prevDetail, priority });
      }
      patchLeadInLists(queryClient, leadId, { priority });
      setPriorityOpen(false);
      return { prevDetail, prevLists };
    },
    onError: (_err, _p, ctx) => {
      if (ctx?.prevDetail) {
        queryClient.setQueryData(['lead', leadId], ctx.prevDetail);
      }
      if (ctx?.prevLists) {
        for (const [key, data] of ctx.prevLists) {
          queryClient.setQueryData(key, data);
        }
      }
      Alert.alert('Could not update priority');
    },
    onSuccess: (updated) => {
      if (!updated) return;
      queryClient.setQueryData(['lead', leadId], updated);
      patchLeadInLists(queryClient, leadId, {
        priority: updated.priority ?? null,
        updatedAt: updated.updatedAt,
      });
    },
  });

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

  // After a failed first load, keep the tapped row on screen (call and
  // WhatsApp still work); the detail sections show the error and a retry.
  const fallbackRow =
    leadQuery.data === undefined && leadQuery.isError
      ? findListLead(queryClient, leadId)
      : undefined;
  const lead = leadQuery.data ?? fallbackRow;
  // Only the list row is known: its summary fields are real, detail-only
  // fields are not loaded yet, and writes still need the record's version.
  const partial = leadQuery.isPlaceholderData || fallbackRow !== undefined;
  // Saved detail on screen, but this open's refresh failed.
  const refreshFailed = leadQuery.isError && !partial && !!lead;

  const headerTitle =
    lead?.buyerPersona?.fullName?.trim() ||
    (Number.isFinite(leadId) ? `Lead #${leadId}` : 'Lead');

  function openNote(stageId: number | null = null) {
    if (!lead || partial) return;
    setNoteStageId(stageId);
    setNoteOpen(true);
    setNoteMounted(true);
  }

  const headerRight = (
    <HeaderAddButton
      label="Add Note"
      disabled={!lead || partial}
      onPress={() => openNote(null)}
    />
  );

  const sectionPending = (
    <QueryPlaceholder
      query={leadQuery}
      errorMessage={getErrorMessage(
        leadQuery.error,
        'Could not load lead details'
      )}
      skeleton={<LeadSectionSkeleton />}
    />
  );

  const screenBg = {
    backgroundColor: isDark ? colors.background : '#F9FAFB', // gray-50
  };

  if (!lead) {
    return (
      <Screen
        style={screenBg}
        header={<ScreenHeader title="Lead" right={headerRight} />}
        footer={
          <LeadDetailTabBar active={activeTab} onChange={setActiveTab} />
        }
      >
        {Number.isFinite(leadId) && lead !== null ? (
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

  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const sm = summarizeLead(lead, metaQuery.data);
  const currentStatusId = lead.leadStatus?.id ?? null;
  const priority = (lead.priority ?? null) as LeadPriority | null;
  const priorityMeta = priority ? PRIORITY_META[priority] : null;
  const priorityBadge = priority
    ? priorityBadgeColors(priority, isDark)
    : null;

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
      style={screenBg}
      header={<ScreenHeader title={headerTitle} right={headerRight} />}
      footer={
        <LeadDetailTabBar active={activeTab} onChange={setActiveTab} />
      }
      scroll
      refreshing={leadQuery.isRefetching && !partial}
      onRefresh={() => leadQuery.refetch()}
    >
      {refreshFailed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void leadQuery.refetch()}
          style={styles.refreshNotice}
        >
          <Text style={styles.pendingText}>
            Couldn&apos;t refresh — showing details saved on this device. Tap
            to retry.
          </Text>
        </Pressable>
      ) : null}
      {activeTab === 'overview' ? (
        <View style={styles.overviewBlock}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHero}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change priority"
                  disabled={partial}
                  onPress={() => setPriorityOpen(true)}
                  style={({ pressed }) => [
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
                    pressed && styles.pressed,
                  ]}
                >
                  {priority ? (
                    <HugeiconsIcon
                      icon={PRIORITY_ICON[priority]}
                      size={13}
                      color={priorityBadge!.color}
                      strokeWidth={1.5}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: priorityBadge?.color ?? colors.textMuted },
                    ]}
                  >
                    {priorityMeta?.label ?? 'Priority'}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={11}
                    color={priorityBadge?.color ?? colors.textMuted}
                  />
                </Pressable>
              </View>

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
                onStepPress={partial ? undefined : (id) => openNote(id)}
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

          {!partial ? (
            <LeadFollowupCard
              lead={lead}
              onPress={() => openNote(null)}
            />
          ) : null}

          <LeadSectionShell
            pills={[
              { key: 'profile', label: 'Buyer Profile' },
              { key: 'requirements', label: 'Requirements' },
            ]}
            activeKey={overviewPill}
            onPillChange={(k) =>
              setOverviewPill(k as 'profile' | 'requirements')
            }
          >
            {partial ? (
              sectionPending
            ) : overviewPill === 'profile' ? (
              <LeadBuyerProfilePanel lead={lead} meta={metaQuery.data} />
            ) : (
              <LeadRequirementsPanel lead={lead} meta={metaQuery.data} />
            )}
          </LeadSectionShell>
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
          {partial ? sectionPending : <LeadHistoryPanel lead={lead} />}
        </View>
      ) : null}

      {activeTab === 'calls' ? (
        <View style={styles.pageBlock}>
          <Text style={styles.pageTitle}>Call History</Text>
          {partial ? sectionPending : <LeadCallHistoryPanel lead={lead} />}
        </View>
      ) : null}

      {activeTab === 'views' ? (
        <View style={styles.pageBlock}>
          <Text style={styles.pageTitle}>View History</Text>
          <LeadViewHistoryPanel leadId={leadId} />
        </View>
      ) : null}

      {noteMounted && !partial ? (
        <AddNoteSheet
          visible={noteOpen}
          lead={lead}
          statuses={statusesQuery.data ?? []}
          accountId={accountId}
          initialStageId={noteStageId}
          onClose={() => {
            setNoteOpen(false);
            setNoteStageId(null);
          }}
          onSaved={() => {
            void leadQuery.refetch();
          }}
        />
      ) : null}

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
              const opt = priorityBadgeColors(p, isDark);
              const selected = p === priority;
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
                  disabled={priorityMutation.isPending || selected}
                  onPress={() => priorityMutation.mutate(p)}
                >
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[p]}
                    size={16}
                    color={opt.color}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[styles.priorityOptionText, { color: opt.color }]}
                  >
                    {meta.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={opt.color} />
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
    overviewBlock: { gap: spacing.md },
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
    refreshNotice: {
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.warningSoft,
    },
    noteBody: { ...typography.body, color: colors.textSecondary },
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
