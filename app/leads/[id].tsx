import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import {
  ArrowDownDoubleIcon,
  ChartBarsIcon,
  FlameIcon,
  MinusSignIcon,
  PencilEdit02Icon,
  UserAdd01Icon,
} from '@/components/icons/hugeicons';
import { AddNoteSheet } from '@/components/leads/AddNoteSheet';
import { LeadBuyerProfilePanel } from '@/components/leads/LeadBuyerProfilePanel';
import { LeadCallHistoryPanel } from '@/components/leads/LeadCallHistoryPanel';
import { LeadFollowupCard } from '@/components/leads/LeadFollowupCard';
import {
  LeadDetailTabBar,
  type LeadDetailTab,
} from '@/components/leads/LeadDetailTabBar';
import {
  cardShadow,
  leadDetailPalette,
  type LeadDetailPalette,
} from '@/components/leads/leadDetailPalette';
import { LeadHistoryPanel } from '@/components/leads/LeadHistoryPanel';
import { LeadPipeline } from '@/components/leads/LeadPipeline';
import { LeadRequirementsPanel } from '@/components/leads/LeadRequirementsPanel';
import { LeadSectionShell } from '@/components/leads/LeadSectionShell';
import { LeadViewHistoryPanel } from '@/components/leads/LeadViewHistoryPanel';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
  normalizeLeadTemperature,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
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
  COLD: ArrowDownDoubleIcon,
  WARM: MinusSignIcon,
  HOT: FlameIcon,
} as const;

export default function LeadDetailScreen() {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = useMemo(
    () => leadDetailPalette(colors, isDark),
    [colors, isDark]
  );
  const styles = useMemo(
    () => createStyles(colors, palette, isDark),
    [colors, palette, isDark]
  );
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = Number(id);
  const { user } = useAuth();
  const accountId = user?.id ?? '';
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

  // White status-bar icons over the blue header, in both themes.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

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
      const prevLists = queryClient.getQueriesData({ queryKey: ['leads'] })
        .concat(queryClient.getQueriesData({ queryKey: ['my-follow-ups'] }));
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
      Alert.alert('Could not update temperature');
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

  const noteDisabled = !lead || partial;
  const headerRight = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add Note"
      accessibilityState={{ disabled: noteDisabled }}
      disabled={noteDisabled}
      onPress={() => openNote(null)}
      style={({ pressed }) => [
        styles.noteBtn,
        pressed && styles.pressed,
        noteDisabled && styles.noteBtnDisabled,
      ]}
    >
      <HugeiconsIcon
        icon={PencilEdit02Icon}
        size={18}
        color={colors.white}
        strokeWidth={1.8}
      />
      <Text style={styles.noteBtnText} numberOfLines={1}>
        Add Note
      </Text>
    </Pressable>
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

  // Blue band with the title, then a rounded sheet that alone scrolls.
  const shell = (title: string, body: ReactNode, refreshable: boolean) => (
    <Screen
      style={{ backgroundColor: palette.header }}
      header={
        <ScreenHeader
          title={title}
          titleCentered={false}
          tone="brand"
          right={headerRight}
        />
      }
      footer={<LeadDetailTabBar active={activeTab} onChange={setActiveTab} />}
      contentStyle={styles.sheet}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        refreshControl={
          refreshable ? (
            <AppRefreshControl
              refreshing={leadQuery.isRefetching && !partial}
              onRefresh={() => void leadQuery.refetch()}
              tintColor={colors.brand}
            />
          ) : undefined
        }
      >
        {body}
      </ScrollView>
    </Screen>
  );

  if (!lead) {
    return shell(
      'Lead',
      Number.isFinite(leadId) && lead !== null ? (
        <QueryPlaceholder
          query={leadQuery}
          errorMessage={getErrorMessage(leadQuery.error, 'Lead not found')}
          skeleton={<LeadDetailSkeleton />}
        />
      ) : (
        <ErrorState message="Lead not found" />
      ),
      false
    );
  }

  const name = lead.buyerPersona?.fullName || 'Unnamed lead';
  const phone = lead.buyerPersona?.phone;
  const email = lead.buyerPersona?.email?.trim() || '';
  const whatsapp = lead.buyerPersona?.whatsapp || phone;
  const assignee =
    user?.id && lead.assignedTo === user.id
      ? user.name?.trim() || lead.assignedToName
      : lead.assignedToName;
  const currentStatusId = lead.leadStatus?.id ?? null;
  const priority = normalizeLeadTemperature(
    lead.temperature ?? lead.priority
  );
  const priorityMeta = priority ? PRIORITY_META[priority] : null;
  const priorityBadge = priority
    ? priorityBadgeColors(priority, isDark)
    : null;

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

  return shell(
    headerTitle,
    <>
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
          <View style={[styles.card, styles.contactCard]}>
            <View style={styles.contactTop}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={30} color={colors.brand} />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.name} numberOfLines={2}>
                  {name}
                </Text>
                {phone || whatsapp ? (
                  <View style={styles.infoLine}>
                    <Ionicons name="call" size={15} color={colors.brand} />
                    <Text style={styles.phoneText} numberOfLines={1}>
                      {formatPhoneDisplay(phone || whatsapp)}
                    </Text>
                  </View>
                ) : null}
                {email ? (
                  <View style={styles.infoLine}>
                    <Ionicons name="mail" size={15} color={colors.brand} />
                    <Text style={styles.emailText} numberOfLines={1}>
                      {email}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.actionsDivider} />

              <View style={styles.actions}>
                <ContactAction
                  label="Call"
                  icon="call"
                  bg={colors.brand}
                  disabled={!phone}
                  onPress={() => void onCall()}
                  styles={styles}
                />
                <ContactAction
                  label="WhatsApp"
                  icon="logo-whatsapp"
                  bg="#25D366"
                  disabled={!whatsapp}
                  onPress={() => void onWhatsApp()}
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.assignRow}>
              <HugeiconsIcon
                icon={UserAdd01Icon}
                size={18}
                color={colors.brand}
                strokeWidth={2}
              />
              <Text style={styles.assignText} numberOfLines={1}>
                Assign by{' '}
                <Text style={styles.assignName}>
                  {assignee?.trim() || '—'}
                </Text>
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change temperature"
                disabled={partial}
                hitSlop={6}
                onPress={() => setPriorityOpen(true)}
                style={({ pressed }) => [
                  styles.priorityChip,
                  priorityBadge
                    ? {
                        backgroundColor: priorityBadge.backgroundColor,
                        borderColor: priorityBadge.borderColor,
                      }
                    : {
                        backgroundColor: palette.tint,
                        borderColor: palette.cardBorder,
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
                    { color: priorityBadge?.color ?? palette.muted },
                  ]}
                >
                  {priorityMeta?.label ?? 'Temperature'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={11}
                  color={priorityBadge?.color ?? palette.muted}
                />
              </Pressable>
            </View>

            {pendingStatusName ? (
              <Text style={styles.pendingText}>
                Changing to {pendingStatusName} · waiting to sync
              </Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <HugeiconsIcon
                icon={ChartBarsIcon}
                size={20}
                color={colors.brand}
              />
              <Text style={styles.cardTitle}>Lead Journey</Text>
            </View>
            <LeadPipeline
              statuses={statusesQuery.data ?? []}
              currentStatusId={currentStatusId}
              assignedToName={lead.assignedToName}
              onStepPress={partial ? undefined : (id) => openNote(id)}
            />
          </View>

          {!partial ? (
            <LeadFollowupCard
              lead={lead}
              onPress={() => openNote(null)}
            />
          ) : null}

          <LeadSectionShell
            pills={[
              { key: 'profile', label: 'Buyer Profile', icon: 'person-outline' },
              {
                key: 'requirements',
                label: 'Requirements',
                icon: 'document-text-outline',
              },
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
            <Text style={styles.modalTitle}>Temperature</Text>
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
    </>,
    true
  );
}

function ContactAction({
  label,
  icon,
  bg,
  disabled,
  onPress,
  styles,
}: {
  label: string;
  icon: 'call' | 'logo-whatsapp';
  bg: string;
  disabled: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        (pressed || disabled) && styles.actionFaded,
      ]}
    >
      <View style={[styles.actionCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={icon === 'call' ? 20 : 22} color="#fff" />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(
  colors: ThemeColors,
  palette: LeadDetailPalette,
  isDark: boolean
) {
  return StyleSheet.create({
    pressed: { opacity: 0.85 },
    sheet: {
      // flex, not Screen's flexGrow: the sheet must not grow to its
      // content, or the scroll view has nothing to scroll.
      flex: 1,
      padding: 0,
      gap: 0,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      overflow: 'hidden',
      backgroundColor: palette.sheet,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    noteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 38,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.85)',
      flexShrink: 0,
    },
    noteBtnDisabled: { opacity: 0.5 },
    noteBtnText: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '600',
      color: colors.white,
    },
    overviewBlock: { gap: spacing.md },
    card: {
      backgroundColor: palette.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      padding: spacing.lg,
      gap: spacing.md,
      ...cardShadow(isDark),
    },
    contactCard: { paddingHorizontal: 14 },
    contactTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.soft,
      flexShrink: 0,
    },
    contactInfo: { flex: 1, minWidth: 0, gap: 5 },
    name: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: palette.ink,
    },
    infoLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      minWidth: 0,
    },
    phoneText: {
      flexShrink: 1,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '500',
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    emailText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 16,
      color: palette.body,
    },
    actionsDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: palette.divider,
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
      flexShrink: 0,
    },
    action: { alignItems: 'center', gap: 6, minWidth: 44 },
    actionCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionLabel: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '500',
      color: palette.ink,
    },
    actionFaded: { opacity: 0.4 },
    assignRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    },
    assignText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 19,
      color: palette.body,
    },
    assignName: { fontWeight: '700', color: colors.brand },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: '700',
      color: palette.ink,
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
    pageBlock: { gap: spacing.md },
    pageTitle: { ...typography.subtitle, color: palette.ink },
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
