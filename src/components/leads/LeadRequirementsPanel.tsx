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
import { labelOf, labelsOf } from '@/features/leads/leadMeta';
import { formatMoney } from '@/features/leads/leadSummary';
import { radii, spacing, useTheme } from '@/theme';
import type { LeadDetail, LeadMeta } from '@/types/api';
import { formatCalendarDate } from '@/utils/dates';

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

function filled(value?: string | null) {
  return !!value?.trim();
}

export function LeadRequirementsPanel({ lead, meta }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const palette = useMemo(
    () => leadDetailPalette(colors, isDark),
    [colors, isDark]
  );
  const styles = useMemo(() => createStyles(palette), [palette]);

  /** Form defaults use key "unknown" — treat as empty, same as Buyer Profile. */
  const knownKey = (key?: string | null) =>
    key && key !== 'unknown' ? key : null;

  const one = (group: string, key?: string | null, fixed = false) => {
    const k = knownKey(key);
    return k ? labelOf(meta, group, k, fixed) : null;
  };
  const many = (group: string, keys?: string[] | null, fixed = false) => {
    const filtered = (keys ?? []).filter((k) => knownKey(k));
    return labelsOf(meta, group, filtered, fixed);
  };

  const interests = lead.propertyInterests ?? [];
  const interestLabel = interests.length
    ? interests
        .map((pi, i) => {
          const inv = pi.inventory;
          const name = `${inv?.name ?? `Unit #${pi.inventoryId}`}${
            inv?.isDeleted ? ' (deleted)' : ''
          }`;
          return i === 0 ? `${name} (Primary)` : name;
        })
        .join(', ')
    : null;

  const unitSize =
    lead.unitSizeMin != null || lead.unitSizeMax != null
      ? `${lead.unitSizeMin ?? '—'} – ${lead.unitSizeMax ?? '—'}`
      : null;

  const fields: FieldDef[] = [
    {
      key: 'srcDetail',
      label: 'Source detail',
      icon: 'megaphone-outline',
      value: lead.sourceDetail,
    },
    {
      key: 'project',
      label: 'Lead project',
      icon: 'business-outline',
      value: lead.leadProject,
    },
    {
      key: 'referral',
      label: 'Referral source',
      icon: 'share-social-outline',
      value: lead.referralSource,
    },
    {
      key: 'occCat',
      label: 'Occupation category',
      icon: 'briefcase-outline',
      value: one('occupation_category', lead.occupationCategory),
    },
    {
      key: 'occDet',
      label: 'Occupation detail',
      icon: 'document-text-outline',
      value: lead.occupationDetail,
    },
    {
      key: 'buyerType',
      label: 'Buyer type',
      icon: 'people-outline',
      value: one('buyer_type', lead.buyerType),
    },
    {
      key: 'authority',
      label: 'Decision authority',
      icon: 'shield-checkmark-outline',
      value: one('decision_authority', lead.decisionAuthority, true),
    },
    {
      key: 'interest',
      label: 'Property interest',
      icon: 'home-outline',
      value: interestLabel,
    },
    {
      key: 'purpose',
      label: 'Purchase purpose',
      icon: 'flag-outline',
      value: many('purchase_purpose', lead.purchasePurpose),
    },
    {
      key: 'propType',
      label: 'Property type',
      icon: 'layers-outline',
      value: many('property_type', lead.propertyTypes),
    },
    {
      key: 'loc',
      label: 'Preferred location',
      icon: 'location-outline',
      value: many('preferred_location', lead.preferredLocations),
    },
    {
      key: 'unitSize',
      label: 'Unit size (sq ft)',
      icon: 'resize-outline',
      value: unitSize,
    },
    {
      key: 'beds',
      label: 'Bedrooms',
      icon: 'bed-outline',
      value: one('bedrooms', lead.bedrooms, true),
    },
    {
      key: 'mustHave',
      label: 'Must-have requirements',
      icon: 'checkmark-circle-outline',
      value: lead.mustHaveRequirements,
    },
    {
      key: 'also',
      label: 'Also considering',
      icon: 'git-compare-outline',
      value: lead.alsoConsidering,
    },
    {
      key: 'bmin',
      label: 'Budget min',
      icon: 'cash-outline',
      value: lead.budgetMin != null ? formatMoney(lead.budgetMin) : null,
    },
    {
      key: 'bmax',
      label: 'Budget max',
      icon: 'wallet-outline',
      value: lead.budgetMax != null ? formatMoney(lead.budgetMax) : null,
    },
    {
      key: 'fin',
      label: 'Financing required',
      icon: 'card-outline',
      value: one('financing_required', lead.financingRequired, true),
    },
    {
      key: 'pay',
      label: 'Payment method',
      icon: 'card-outline',
      value: one('preferred_payment_method', lead.preferredPaymentMethod, true),
    },
    {
      key: 'down',
      label: 'Down payment',
      icon: 'cash-outline',
      value: formatMoney(lead.downPaymentAvailable),
    },
    {
      key: 'income',
      label: 'Monthly household income',
      icon: 'trending-up-outline',
      value: one('monthly_income', lead.monthlyHouseholdIncome),
    },
    {
      key: 'flex',
      label: 'Budget flexibility',
      icon: 'swap-horizontal-outline',
      value: one('budget_flexibility', lead.budgetFlexibility, true),
    },
    {
      key: 'timeline',
      label: 'Purchase timeline',
      icon: 'hourglass-outline',
      value: one('purchase_timeline', lead.purchaseTimeline, true),
    },
    {
      key: 'target',
      label: 'Target purchase date',
      icon: 'calendar-outline',
      value: lead.targetPurchaseDate
        ? formatCalendarDate(lead.targetPurchaseDate)
        : null,
    },
    {
      key: 'urgency',
      label: 'Urgency',
      icon: 'flash-outline',
      value: one('urgency', lead.urgency, true),
    },
    {
      key: 'tlReason',
      label: 'Reason for timeline',
      icon: 'chatbubble-ellipses-outline',
      value: lead.timelineReason,
    },
    {
      key: 'living',
      label: 'Living situation',
      icon: 'home-outline',
      value: one('current_living_situation', lead.currentLivingSituation, true),
    },
    {
      key: 'curLoc',
      label: 'Current location',
      icon: 'navigate-outline',
      value: lead.currentLocation,
    },
    {
      key: 'family',
      label: 'Family size',
      icon: 'people-outline',
      value: lead.familySize != null ? String(lead.familySize) : null,
    },
    {
      key: 'rent',
      label: 'Monthly rent',
      icon: 'cash-outline',
      value: formatMoney(lead.currentMonthlyRent),
    },
    {
      key: 'owns',
      label: 'Owns existing property',
      icon: 'key-outline',
      value: one('owns_existing_property', lead.ownsExistingProperty, true),
    },
    {
      key: 'portfolio',
      label: 'Portfolio notes',
      icon: 'document-outline',
      value: lead.existingPropertyNotes,
    },
    {
      key: 'problemCat',
      label: 'Problem category',
      icon: 'alert-circle-outline',
      value: many('problem_category', lead.problemCategory, true),
    },
    {
      key: 'severity',
      label: 'Problem severity',
      icon: 'warning-outline',
      value: one('problem_severity', lead.problemSeverity, true),
    },
    {
      key: 'problemDesc',
      label: 'Problem description',
      icon: 'create-outline',
      value: lead.problemDescription,
    },
    {
      key: 'impact',
      label: 'Impact of current problem',
      icon: 'pulse-outline',
      value: lead.impactOfCurrentProblem,
    },
    {
      key: 'finImpact',
      label: 'Financial impact',
      icon: 'stats-chart-outline',
      value: lead.financialImpact,
    },
    {
      key: 'famImpact',
      label: 'Family / business impact',
      icon: 'git-network-outline',
      value: lead.familyBusinessImpact,
    },
    {
      key: 'risk',
      label: 'Risk of not solving',
      icon: 'close-circle-outline',
      value: lead.riskOfNotSolving,
    },
    {
      key: 'urgencySolve',
      label: 'Urgency to solve',
      icon: 'timer-outline',
      value: one('urgency_to_solve', lead.urgencyToSolve, true),
    },
    {
      key: 'outcome',
      label: 'Desired outcome',
      icon: 'ribbon-outline',
      value: lead.desiredOutcome,
    },
    {
      key: 'solution',
      label: 'Preferred property solution',
      icon: 'bulb-outline',
      value: lead.preferredPropertySolution,
    },
    {
      key: 'benefit',
      label: 'Expected benefit',
      icon: 'star-outline',
      value: lead.expectedBenefit,
    },
  ];

  const filledCount = fields.filter((f) => filled(f.value)).length;
  const total = fields.length;
  const pct = total ? Math.round((filledCount / total) * 100) : 0;
  const next = fields.find((f) => !filled(f.value))?.label;
  const done = pct >= 100;

  const rows: (FieldDef | null)[][] = [];
  for (let i = 0; i < fields.length; i += COLUMNS) {
    const row: (FieldDef | null)[] = fields.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    rows.push(row);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <View style={styles.completionRow}>
          <Text style={styles.completionLabel}>Requirements</Text>
          <Text style={[styles.completionPct, done && { color: colors.success }]}>
            {pct}%
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${pct}%`,
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
            {filledCount}/{total} fields filled
            {done ? ' · Done' : next ? ` · next: ${next}` : ''}
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
