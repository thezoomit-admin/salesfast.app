import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatMoney,
  profileCompletion,
  summarizeLead,
} from '@/features/leads/leadSummary';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail, LeadMeta } from '@/types/api';
import { formatDateTime } from '@/utils/dates';

type Props = {
  lead: LeadDetail;
  meta?: LeadMeta | null;
};

export function LeadBuyerProfilePanel({ lead, meta }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sm = useMemo(() => summarizeLead(lead, meta), [lead, meta]);
  const stats = useMemo(() => profileCompletion(lead, meta), [lead, meta]);

  const followUp =
    lead.pendingFollowUp?.dueAt ?? lead.nextFollowupDate ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.completionRow}>
        <Text style={styles.completionLabel}>Profile</Text>
        <Text
          style={[
            styles.completionPct,
            stats.pct >= 100 && { color: colors.success },
          ]}
        >
          {stats.pct}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${stats.pct}%`,
              backgroundColor:
                stats.pct >= 100 ? colors.success : colors.brand,
            },
          ]}
        />
      </View>
      <Text style={styles.completionHint}>
        {stats.filled}/{stats.total} fields filled
        {stats.pct >= 100
          ? ' · Done'
          : stats.missing[0]
            ? ` · next: ${stats.missing[0]}`
            : ''}
      </Text>

      <View style={styles.grid}>
        <Field label="Occupation" value={sm.occupation} styles={styles} />
        <Field
          label="NID"
          value={lead.buyerPersona?.profile?.nid}
          styles={styles}
        />
        <Field label="Property type" value={sm.propertyType} styles={styles} />
        <Field label="Preferred location" value={sm.location} styles={styles} />
        <Field label="Size / unit" value={sm.size} styles={styles} />
        <Field
          label="Budget min"
          value={sm.budgetMin != null ? formatMoney(sm.budgetMin) : null}
          styles={styles}
        />
        <Field
          label="Budget max"
          value={sm.budgetMax != null ? formatMoney(sm.budgetMax) : null}
          styles={styles}
        />
        <Field label="Financing" value={sm.financing} styles={styles} />
        <Field label="Timeline" value={sm.timeline} styles={styles} />
        <Field label="Source" value={lead.leadSource?.name} styles={styles} />
        <Field label="Assigned to" value={lead.assignedToName} styles={styles} />
        <Field
          label="Next follow-up"
          value={followUp ? formatDateTime(followUp) : null}
          styles={styles}
        />
        <Field label="Email" value={lead.buyerPersona?.email} styles={styles} />
        <Field
          label="Address"
          value={lead.buyerPersona?.address}
          styles={styles}
        />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | null;
  styles: ReturnType<typeof createStyles>;
}) {
  const empty = !value?.trim();
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, empty && styles.fieldEmpty]}>
        {empty ? '—' : value}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.md },
    completionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    completionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '600',
    },
    completionPct: {
      ...typography.subtitle,
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    progressTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.primary50,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    completionHint: { ...typography.caption, color: colors.textSecondary },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: spacing.xs,
    },
    field: { width: '47%', gap: 2 },
    fieldLabel: { ...typography.caption, color: colors.textMuted },
    fieldValue: { ...typography.body, color: colors.text },
    fieldEmpty: { color: colors.textMuted },
  });
}
