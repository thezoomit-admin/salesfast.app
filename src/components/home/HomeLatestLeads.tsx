import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ArrowDownDoubleIcon,
  CallIcon,
  FlameIcon,
  MinusSignIcon,
} from '@/components/icons/hugeicons';
import { HomeSection } from '@/components/home/HomeSection';
import { LeadHistorySheet } from '@/components/home/LeadHistorySheet';
import { PriorityPickerSheet } from '@/components/home/PriorityPickerSheet';
import {
  PRIORITY_META,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
import { useLeadPriorityMutation } from '@/features/leads/useLeadPriorityMutation';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';
import type { LeadPriority, MobileDashboard } from '@/types/api';
import { followupWhenLabel } from '@/utils/dates';
import { openPhoneDialer, openWhatsApp } from '@/utils/phone';

type RecentLead = MobileDashboard['recentLeads'][number];

type Props = {
  leads: RecentLead[];
};

type HistoryTarget = {
  leadId: number;
  leadName: string;
};

const MAX = 5;

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

function whenLabel(lead: RecentLead) {
  return followupWhenLabel(lead.nextFollowupDate, lead.updatedAt);
}

export function HomeLatestLeads({ leads }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [history, setHistory] = useState<HistoryTarget | null>(null);
  const [priorityLeadId, setPriorityLeadId] = useState<number | null>(null);

  const items = useMemo(() => leads.slice(0, MAX), [leads]);
  const openLead = useMemo(
    () => items.find((l) => l.id === priorityLeadId) ?? null,
    [items, priorityLeadId]
  );

  const priorityMutation = useLeadPriorityMutation(() =>
    setPriorityLeadId(null)
  );

  return (
    <HomeSection
      title="Latest leads"
      onSeeAll={() => router.navigate('/(tabs)/leads')}
    >
      {items.length === 0 ? (
        <Text style={styles.empty}>
          No recent leads yet. New assigns will show up here.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.slider}
          contentContainerStyle={styles.sliderRow}
        >
          {items.map((lead) => {
            const statusName = lead.status?.name || 'Lead';
            const statusColor = lead.status?.color || colors.brand;
            const priority = (lead.priority as LeadPriority | null) ?? null;
            const priorityMeta = priority ? PRIORITY_META[priority] : null;
            const priorityBadge = priority
              ? priorityBadgeColors(priority, isDark)
              : null;
            const subtitle = [lead.source?.name, lead.assignedToName]
              .filter(Boolean)
              .join(' · ');
            const historyOpen = history?.leadId === lead.id;

            return (
              <View key={lead.id} style={styles.card}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${lead.name || 'lead'}`}
                  onPress={() => router.push(`/leads/${lead.id}`)}
                  style={styles.cover}
                >
                  <View
                    style={[styles.coverWash, { backgroundColor: statusColor }]}
                  />
                  <View
                    style={[styles.coverMark, { backgroundColor: statusColor }]}
                  >
                    <Text style={styles.coverInitial}>
                      {(lead.name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Pressable
                      onPress={() => router.push(`/leads/${lead.id}`)}
                      style={({ pressed }) => [
                        styles.nameTap,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.name} numberOfLines={1}>
                        {lead.name || 'Unnamed lead'}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Change priority"
                      accessibilityState={{
                        expanded: priorityLeadId === lead.id,
                      }}
                      hitSlop={4}
                      onPress={() =>
                        setPriorityLeadId((cur) =>
                          cur === lead.id ? null : lead.id
                        )
                      }
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
                      {priority ? (
                        <HugeiconsIcon
                          icon={PRIORITY_ICON[priority]}
                          size={12}
                          color={priorityBadge!.color}
                          strokeWidth={1.5}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.priorityText,
                          {
                            color:
                              priorityBadge?.color ?? colors.textMuted,
                          },
                        ]}
                      >
                        {priorityMeta?.label ?? 'Priority'}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={12}
                        color={priorityBadge?.color ?? colors.textMuted}
                      />
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => router.push(`/leads/${lead.id}`)}
                    style={({ pressed }) => [
                      styles.cardMain,
                      pressed && styles.pressed,
                    ]}
                  >
                    {subtitle ? (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}

                    <View style={styles.metaRow}>
                      <View style={styles.ribbonWrap}>
                        <View
                          style={[
                            styles.ribbon,
                            { backgroundColor: statusColor },
                          ]}
                        >
                          <Text style={styles.ribbonText} numberOfLines={1}>
                            {statusName}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.ribbonTip,
                            { borderLeftColor: statusColor },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.when,
                          whenLabel(lead).startsWith('Overdue') && {
                            color: colors.danger,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {whenLabel(lead)}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                <View style={styles.cardFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: historyOpen }}
                    accessibilityLabel="Open lead history"
                    hitSlop={6}
                    onPress={() =>
                      setHistory({
                        leadId: lead.id,
                        leadName: lead.name || 'Lead',
                      })
                    }
                    style={({ pressed }) => [
                      styles.historyBtn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.historyText}>History</Text>
                    <Ionicons
                      name={historyOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>

                  <View style={styles.actionBtns}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Call lead"
                      disabled={!lead.phone}
                      hitSlop={8}
                      onPress={async () => {
                        const ok = await openPhoneDialer(lead.phone);
                        if (!ok) {
                          Alert.alert(
                            'Unable to dial',
                            'No phone number available.'
                          );
                        }
                      }}
                      style={({ pressed }) => [
                        (!lead.phone || pressed) && styles.pressed,
                      ]}
                    >
                      <HugeiconsIcon
                        icon={CallIcon}
                        size={20}
                        color={
                          lead.phone ? colors.textSecondary : colors.textMuted
                        }
                        strokeWidth={2}
                      />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="WhatsApp lead"
                      disabled={!lead.phone}
                      hitSlop={8}
                      onPress={async () => {
                        try {
                          const ok = await openWhatsApp(lead.phone);
                          if (!ok) {
                            Alert.alert(
                              'Unable to open WhatsApp',
                              'No number available.'
                            );
                          }
                        } catch {
                          Alert.alert('Unable to open WhatsApp');
                        }
                      }}
                      style={({ pressed }) => [
                        (!lead.phone || pressed) && styles.pressed,
                      ]}
                    >
                      <Ionicons
                        name="logo-whatsapp"
                        size={20}
                        color={lead.phone ? '#25D366' : colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <PriorityPickerSheet
        open={!!openLead}
        leadName={openLead?.name || 'Lead'}
        value={(openLead?.priority as LeadPriority | null) ?? null}
        saving={priorityMutation.isPending}
        onClose={() => setPriorityLeadId(null)}
        onSelect={(priority) => {
          if (!openLead) return;
          priorityMutation.mutate({
            leadId: openLead.id,
            priority,
            previous: (openLead.priority as LeadPriority | null) ?? null,
          });
        }}
      />

      <LeadHistorySheet
        open={!!history}
        leadId={history?.leadId ?? null}
        leadName={history?.leadName ?? ''}
        onClose={() => setHistory(null)}
      />
    </HomeSection>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    empty: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    slider: { marginHorizontal: -spacing.lg },
    sliderRow: { gap: 10, paddingHorizontal: spacing.lg },
    pressed: { opacity: 0.9 },
    card: {
      width: 272,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cover: {
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverWash: {
      ...StyleSheet.absoluteFill,
      opacity: 0.14,
    },
    coverMark: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverInitial: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    cardBody: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    cardMain: {
      gap: 8,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    nameTap: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      flexShrink: 0,
    },
    priorityText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: -2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 2,
    },
    ribbonWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      maxWidth: '62%',
    },
    ribbon: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
      maxWidth: '100%',
    },
    ribbonText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    ribbonTip: {
      width: 0,
      height: 0,
      borderTopWidth: 12,
      borderBottomWidth: 12,
      borderLeftWidth: 9,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    when: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      flexShrink: 0,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 12,
    },
    historyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    historyText: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    actionBtns: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexShrink: 0,
    },
  });
}
