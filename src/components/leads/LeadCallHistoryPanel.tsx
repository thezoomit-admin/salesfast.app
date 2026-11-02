import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CallBlockedIcon,
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOutgoingIcon,
} from '@/components/icons/hugeicons';
import {
  DayGroupHeader,
  LeadSectionShell,
} from '@/components/leads/LeadSectionShell';
import { EmptyState } from '@/components/ui/StateViews';
import { groupByDay, timeOf } from '@/features/leads/dayGroups';
import {
  callBody,
  callKind,
  callNotesOf,
  type CallKind,
} from '@/features/leads/leadActivity';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail } from '@/types/api';

type Props = { lead: LeadDetail };
type CallTab = 'all' | CallKind;
type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

const TABS: { key: CallTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'outgoing', label: 'Outgoing' },
  { key: 'missed', label: 'Missed' },
  { key: 'failed', label: 'Failed' },
];

const PAGE_SIZE = 30;

/** Same Hugeicons as web portal LeadCallHistory DIR_AVATAR. */
const KIND_ICON: Record<CallKind, HugeIconData> = {
  incoming: PhoneIncomingIcon,
  outgoing: PhoneOutgoingIcon,
  missed: PhoneMissedIcon,
  failed: CallBlockedIcon,
};

export function LeadCallHistoryPanel({ lead }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<CallTab>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const displayName =
    lead.buyerPersona?.fullName?.trim() || 'Lead';
  const calls = useMemo(() => callNotesOf(lead), [lead]);

  const counts = useMemo(() => {
    const c = {
      incoming: 0,
      outgoing: 0,
      missed: 0,
      failed: 0,
      total: calls.length,
    };
    for (const n of calls) c[callKind(n.note)] += 1;
    return c;
  }, [calls]);

  const filtered = useMemo(() => {
    if (tab === 'all') return calls;
    return calls.filter((n) => callKind(n.note) === tab);
  }, [calls, tab]);

  const visible = filtered.slice(0, limit);
  const groups = useMemo(
    () => groupByDay(visible, (n) => n.createdAt),
    [visible]
  );
  const hasMore = filtered.length > visible.length;

  const emptyCopy =
    calls.length === 0
      ? 'No call history yet. Add a note with channel Call, or wait for mobile call sync.'
      : tab === 'incoming'
        ? 'No incoming calls logged.'
        : tab === 'outgoing'
          ? 'No outgoing calls logged.'
          : tab === 'missed'
            ? 'No missed calls logged.'
            : tab === 'failed'
              ? 'No failed calls logged.'
              : 'No calls logged.';

  return (
    <LeadSectionShell
      pills={TABS.map((t) => ({
        key: t.key,
        label: t.label,
        count: t.key === 'all' ? counts.total : counts[t.key],
      }))}
      activeKey={tab}
      onPillChange={(k) => {
        setTab(k as CallTab);
        setLimit(PAGE_SIZE);
      }}
    >
      {!filtered.length ? (
        <EmptyState title="No calls" message={emptyCopy} />
      ) : (
        <View>
          {groups.map((g) => (
            <View key={g.key}>
              <DayGroupHeader label={g.label} />
              {g.items.map((n) => {
                const kind = callKind(n.note);
                const body = callBody(n.note);
                const duration =
                  body.duration ||
                  (kind === 'missed' || kind === 'failed' ? '0s' : null) ||
                  '—';
                return (
                  <View key={n.id} style={styles.row}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: kindBg(kind, colors) },
                      ]}
                    >
                      <Ionicons
                        name={KIND_ICON[kind]}
                        size={18}
                        color={kindColor(kind, colors)}
                      />
                    </View>
                    <View style={styles.main}>
                      <View style={styles.header}>
                        <View style={styles.left}>
                          <Text style={styles.name} numberOfLines={1}>
                            {displayName}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {duration}
                            {' · '}
                            {n.addedByName?.trim() || 'Agent'}
                          </Text>
                        </View>
                        <View style={styles.right}>
                          <Text style={styles.time}>{timeOf(n.createdAt)}</Text>
                          {kind === 'missed' ? (
                            <Text style={styles.missed}>Missed</Text>
                          ) : null}
                          {kind === 'failed' ? (
                            <Text style={styles.failed}>Failed</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          {hasMore ? (
            <Pressable
              style={styles.moreBtn}
              onPress={() => setLimit((n) => n + PAGE_SIZE)}
            >
              <Text style={styles.moreText}>View more</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </LeadSectionShell>
  );
}

function kindColor(kind: CallKind, colors: ThemeColors) {
  if (kind === 'incoming') return colors.brand;
  if (kind === 'outgoing') return colors.success;
  if (kind === 'missed') return colors.danger;
  return colors.warning;
}

function kindBg(kind: CallKind, colors: ThemeColors) {
  if (kind === 'incoming') return colors.primary50;
  if (kind === 'outgoing') return colors.successSoft;
  if (kind === 'missed') return colors.dangerSoft;
  return colors.warningSoft;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      alignItems: 'flex-start',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    main: { flex: 1, minWidth: 0 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    left: { flex: 1, minWidth: 0, gap: 2 },
    right: { alignItems: 'flex-end', gap: 2 },
    name: { ...typography.body, fontWeight: '600', color: colors.text },
    meta: { ...typography.caption, color: colors.textSecondary },
    time: { ...typography.caption, color: colors.textMuted },
    missed: {
      ...typography.caption,
      color: colors.danger,
      fontWeight: '700',
    },
    failed: {
      ...typography.caption,
      color: colors.warning,
      fontWeight: '700',
    },
    moreBtn: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    moreText: { ...typography.body, fontWeight: '600', color: colors.text },
  });
}
