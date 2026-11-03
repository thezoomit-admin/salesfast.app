import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns/format';
import { differenceInCalendarDays } from 'date-fns/differenceInCalendarDays';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CallIcon,
} from '@/components/icons/hugeicons';
import { LeadHistorySheet } from '@/components/home/LeadHistorySheet';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';
import { formatRelative, parseDate } from '@/utils/dates';
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

function whenLabel(lead: RecentLead) {
  const due = parseDate(lead.nextFollowupDate);
  if (due) {
    const now = new Date();
    const dayDiff = differenceInCalendarDays(now, due);
    if (dayDiff > 0) {
      return dayDiff === 1
        ? 'Overdue by 1 day'
        : `Overdue by ${dayDiff} days`;
    }
    if (isToday(due)) return format(due, 'h:mm a');
    if (isYesterday(due)) return 'Yesterday';
    return format(due, 'dd MMM');
  }
  return formatRelative(lead.updatedAt);
}

export function HomeLatestLeads({ leads }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [history, setHistory] = useState<HistoryTarget | null>(null);

  const items = useMemo(() => leads.slice(0, MAX), [leads]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Latest leads</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open leads"
          onPress={() => router.navigate('/(tabs)/leads')}
          hitSlop={6}
          style={({ pressed }) => [
            styles.arrowBtn,
            pressed && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            size={18}
            color={colors.brand}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>
          No recent leads yet. New assigns will show up here.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((lead) => {
            const statusName = lead.status?.name || 'Lead';
            const statusColor = lead.status?.color || colors.brand;
            const hasReminder = !!lead.nextFollowupDate;
            const subtitle = [lead.source?.name, lead.assignedToName]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                key={lead.id}
                onPress={() => router.push(`/leads/${lead.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.cardBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {lead.name || 'Unnamed lead'}
                    </Text>
                    {hasReminder ? (
                      <View style={styles.reminderPill}>
                        <Text style={styles.reminderText}>Reminder</Text>
                      </View>
                    ) : null}
                  </View>

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
                </View>

                <View style={styles.cardFooter}>
                  <Pressable
                    accessibilityRole="button"
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
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={14}
                      color={colors.textMuted}
                      strokeWidth={2}
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
              </Pressable>
            );
          })}
        </View>
      )}

      <LeadHistorySheet
        open={!!history}
        leadId={history?.leadId ?? null}
        leadName={history?.leadName ?? ''}
        onClose={() => setHistory(null)}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 2,
    },
    title: {
      ...typography.subtitle,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    arrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 16,
    },
    list: {
      gap: 10,
    },
    pressed: { opacity: 0.9 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    cardBody: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 8,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    name: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      minWidth: 0,
    },
    reminderPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: isDark ? colors.surfaceMuted : '#EEF0F2',
    },
    reminderText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
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
