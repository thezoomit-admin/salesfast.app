import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Calendar03Icon } from '@/components/icons/hugeicons';
import {
  leadDetailPalette,
  type LeadDetailPalette,
} from '@/components/leads/leadDetailPalette';
import { useAuth } from '@/features/auth/AuthContext';
import {
  formatMoney,
  profileCompletion,
  summarizeLead,
} from '@/features/leads/leadSummary';
import { radii, spacing, useTheme } from '@/theme';
import type { LeadDetail, LeadMeta } from '@/types/api';
import { formatDateTime } from '@/utils/dates';

type Props = {
  lead: LeadDetail;
  meta?: LeadMeta | null;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

type FieldDef = {
  key: string;
  label: string;
  icon: IconName;
  value?: string | null;
};

const COLUMNS = 2;

export function LeadBuyerProfilePanel({ lead, meta }: Props) {
  const { user } = useAuth();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = useMemo(
    () => leadDetailPalette(colors, isDark),
    [colors, isDark]
  );
  const styles = useMemo(
    () => createStyles(palette),
    [palette]
  );
  const sm = useMemo(() => summarizeLead(lead, meta), [lead, meta]);
  const stats = useMemo(() => profileCompletion(lead, meta), [lead, meta]);

  const followUp =
    lead.pendingFollowUp?.dueAt ?? lead.nextFollowupDate ?? null;
  const assignee =
    user?.id && lead.assignedTo === user.id
      ? user.name?.trim() || lead.assignedToName
      : lead.assignedToName;

  const fields: FieldDef[] = [
    { key: 'occ', label: 'Occupation', icon: 'briefcase-outline', value: sm.occupation },
    { key: 'nid', label: 'NID', icon: 'id-card-outline', value: lead.buyerPersona?.profile?.nid },
    { key: 'type', label: 'Property type', icon: 'home-outline', value: sm.propertyType },
    { key: 'loc', label: 'Preferred location', icon: 'location-outline', value: sm.location },
    { key: 'size', label: 'Size / unit', icon: 'resize-outline', value: sm.size },
    {
      key: 'bmin',
      label: 'Budget min',
      icon: 'cash-outline',
      value: sm.budgetMin != null ? formatMoney(sm.budgetMin) : null,
    },
    {
      key: 'bmax',
      label: 'Budget max',
      icon: 'wallet-outline',
      value: sm.budgetMax != null ? formatMoney(sm.budgetMax) : null,
    },
    { key: 'fin', label: 'Financing', icon: 'card-outline', value: sm.financing },
    { key: 'time', label: 'Timeline', icon: 'hourglass-outline', value: sm.timeline },
    { key: 'src', label: 'Source', icon: 'megaphone-outline', value: lead.leadSource?.name },
    { key: 'asg', label: 'Assigned to', icon: 'person-outline', value: assignee },
    {
      key: 'fu',
      label: 'Next follow-up',
      icon: 'calendar-outline',
      value: followUp ? formatDateTime(followUp) : null,
    },
    { key: 'mail', label: 'Email', icon: 'mail-outline', value: lead.buyerPersona?.email },
    { key: 'addr', label: 'Address', icon: 'map-outline', value: lead.buyerPersona?.address },
  ];

  const rows: (FieldDef | null)[][] = [];
  for (let i = 0; i < fields.length; i += COLUMNS) {
    const row: (FieldDef | null)[] = fields.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  const done = stats.pct >= 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <View style={styles.completionRow}>
          <Text style={styles.completionLabel}>Profile</Text>
          <Text style={[styles.completionPct, done && { color: colors.success }]}>
            {stats.pct}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${stats.pct}%`,
                backgroundColor: done ? colors.success : colors.brand,
              },
            ]}
          />
        </View>
        <View style={styles.hintRow}>
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={16}
            color={colors.brand}
            strokeWidth={1.8}
          />
          <Text style={styles.completionHint}>
            {stats.filled}/{stats.total} fields filled
            {done
              ? ' · Done'
              : stats.missing[0]
                ? ` · next: ${stats.missing[0]}`
                : ''}
          </Text>
        </View>
      </View>

      <View>
        {rows.map((row, r) => (
          <View key={r} style={[styles.gridRow, r > 0 && styles.gridRowRule]}>
            {row.map((f, c) =>
              f ? (
                <Field
                  key={f.key}
                  field={f}
                  first={c === 0}
                  palette={palette}
                  styles={styles}
                />
              ) : (
                <View
                  key={`blank-${c}`}
                  style={[styles.cell, c > 0 && styles.cellRule]}
                />
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function Field({
  field,
  first,
  palette,
  styles,
}: {
  field: FieldDef;
  first: boolean;
  palette: LeadDetailPalette;
  styles: ReturnType<typeof createStyles>;
}) {
  const value = field.value?.trim();
  return (
    <View style={[styles.cell, !first && styles.cellRule]}>
      <Ionicons
        name={field.icon}
        size={18}
        color={palette.body}
        style={styles.cellIcon}
      />
      <View style={styles.cellText}>
        <Text style={styles.fieldLabel} numberOfLines={2}>
          {field.label}
        </Text>
        <Text
          style={[styles.fieldValue, !value && styles.fieldEmpty]}
          numberOfLines={3}
        >
          {value || '–'}
        </Text>
      </View>
    </View>
  );
}

function createStyles(palette: LeadDetailPalette) {
  return StyleSheet.create({
    wrap: { gap: spacing.xs },
    summary: {
      backgroundColor: palette.tint,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    completionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    completionLabel: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '700',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: palette.body,
    },
    completionPct: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: '700',
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    progressTrack: {
      height: 7,
      borderRadius: 999,
      backgroundColor: palette.soft,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    completionHint: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: palette.ink,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginHorizontal: spacing.xs,
    },
    gridRowRule: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.divider,
    },
    cell: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      paddingVertical: spacing.md,
      paddingHorizontal: 6,
      minWidth: 0,
    },
    cellRule: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: palette.divider,
    },
    cellIcon: { marginTop: 2 },
    cellText: { flex: 1, minWidth: 0, gap: 2 },
    fieldLabel: {
      fontSize: 12.5,
      lineHeight: 16,
      color: palette.body,
    },
    fieldValue: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '600',
      color: palette.ink,
    },
    fieldEmpty: { color: palette.muted, fontWeight: '400' },
  });
}
