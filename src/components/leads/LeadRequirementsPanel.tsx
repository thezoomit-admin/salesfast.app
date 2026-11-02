import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { labelOf, labelsOf } from '@/features/leads/leadMeta';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import type { LeadDetail, LeadMeta } from '@/types/api';
import { formatCalendarDate } from '@/utils/dates';

type Props = {
  lead: LeadDetail;
  meta?: LeadMeta | null;
};

const money = (n: unknown) =>
  n == null || n === '' ? null : `৳ ${Number(n).toLocaleString('en-IN')}`;

function display(value?: string | null) {
  const s = value?.trim();
  return s ? s : '—';
}

export function LeadRequirementsPanel({ lead, meta }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const one = (group: string, key?: string | null, fixed = false) =>
    key ? labelOf(meta, group, key, fixed) : null;
  const many = (group: string, keys?: string[] | null, fixed = false) =>
    labelsOf(meta, group, keys, fixed);

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

  const budget =
    lead.budgetMin != null || lead.budgetMax != null
      ? `${money(lead.budgetMin) ?? '—'} – ${money(lead.budgetMax) ?? '—'}`
      : null;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Requirements</Text>

      <Group title="Buyer & authority" styles={styles}>
        <Row label="Source detail" value={lead.sourceDetail} styles={styles} />
        <Row label="Lead project" value={lead.leadProject} styles={styles} />
        <Row label="Referral source" value={lead.referralSource} styles={styles} />
        <Row
          label="Occupation category"
          value={one('occupation_category', lead.occupationCategory)}
          styles={styles}
        />
        <Row label="Occupation detail" value={lead.occupationDetail} styles={styles} />
        <Row label="Buyer type" value={one('buyer_type', lead.buyerType)} styles={styles} />
        <Row
          label="Decision authority"
          value={one('decision_authority', lead.decisionAuthority, true)}
          styles={styles}
        />
      </Group>

      <Group title="Property requirement" styles={styles}>
        <Row label="Property interest" value={interestLabel} styles={styles} />
        <Row
          label="Purchase purpose"
          value={many('purchase_purpose', lead.purchasePurpose)}
          styles={styles}
        />
        <Row
          label="Property type"
          value={many('property_type', lead.propertyTypes)}
          styles={styles}
        />
        <Row
          label="Preferred location"
          value={many('preferred_location', lead.preferredLocations)}
          styles={styles}
        />
        <Row label="Unit size (sq ft)" value={unitSize} styles={styles} />
        <Row label="Bedrooms" value={one('bedrooms', lead.bedrooms, true)} styles={styles} />
        <Row
          label="Must-have requirements"
          value={lead.mustHaveRequirements}
          styles={styles}
        />
        <Row label="Also considering" value={lead.alsoConsidering} styles={styles} />
      </Group>

      <Group title="Budget & financing" styles={styles}>
        <Row label="Budget" value={budget} styles={styles} />
        <Row
          label="Financing required"
          value={one('financing_required', lead.financingRequired, true)}
          styles={styles}
        />
        <Row
          label="Payment method"
          value={one('preferred_payment_method', lead.preferredPaymentMethod, true)}
          styles={styles}
        />
        <Row label="Down payment" value={money(lead.downPaymentAvailable)} styles={styles} />
        <Row
          label="Monthly household income"
          value={one('monthly_income', lead.monthlyHouseholdIncome)}
          styles={styles}
        />
        <Row
          label="Budget flexibility"
          value={one('budget_flexibility', lead.budgetFlexibility, true)}
          styles={styles}
        />
      </Group>

      <Group title="Timeline" styles={styles}>
        <Row
          label="Purchase timeline"
          value={one('purchase_timeline', lead.purchaseTimeline, true)}
          styles={styles}
        />
        <Row
          label="Target purchase date"
          value={
            lead.targetPurchaseDate
              ? formatCalendarDate(lead.targetPurchaseDate)
              : null
          }
          styles={styles}
        />
        <Row label="Urgency" value={one('urgency', lead.urgency, true)} styles={styles} />
        <Row label="Reason for timeline" value={lead.timelineReason} styles={styles} />
      </Group>

      <Group title="Discovery — Situation" styles={styles}>
        <Row
          label="Living situation"
          value={one('current_living_situation', lead.currentLivingSituation, true)}
          styles={styles}
        />
        <Row label="Current location" value={lead.currentLocation} styles={styles} />
        <Row
          label="Family size"
          value={lead.familySize != null ? String(lead.familySize) : null}
          styles={styles}
        />
        <Row label="Monthly rent" value={money(lead.currentMonthlyRent)} styles={styles} />
        <Row
          label="Owns existing property"
          value={one('owns_existing_property', lead.ownsExistingProperty, true)}
          styles={styles}
        />
        <Row label="Portfolio notes" value={lead.existingPropertyNotes} styles={styles} />
      </Group>

      <Group title="Discovery — Problem & implication" styles={styles}>
        <Row
          label="Problem category"
          value={many('problem_category', lead.problemCategory, true)}
          styles={styles}
        />
        <Row
          label="Problem severity"
          value={one('problem_severity', lead.problemSeverity, true)}
          styles={styles}
        />
        <Row label="Problem description" value={lead.problemDescription} styles={styles} />
        <Row
          label="Impact of current problem"
          value={lead.impactOfCurrentProblem}
          styles={styles}
        />
        <Row label="Financial impact" value={lead.financialImpact} styles={styles} />
        <Row
          label="Family / business impact"
          value={lead.familyBusinessImpact}
          styles={styles}
        />
        <Row label="Risk of not solving" value={lead.riskOfNotSolving} styles={styles} />
        <Row
          label="Urgency to solve"
          value={one('urgency_to_solve', lead.urgencyToSolve, true)}
          styles={styles}
        />
      </Group>

      <Group title="Discovery — Need-payoff" styles={styles} last>
        <Row label="Desired outcome" value={lead.desiredOutcome} styles={styles} />
        <Row
          label="Preferred property solution"
          value={lead.preferredPropertySolution}
          styles={styles}
        />
        <Row label="Expected benefit" value={lead.expectedBenefit} styles={styles} />
      </Group>
    </View>
  );
}

function Group({
  title,
  children,
  styles,
  last,
}: {
  title: string;
  children: ReactNode;
  styles: ReturnType<typeof createStyles>;
  last?: boolean;
}) {
  return (
    <View style={[styles.group, last && styles.groupLast]}>
      <Text style={styles.groupTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value?: string | null;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, (!value || !value.trim()) && styles.rowEmpty]}>
        {display(value)}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    panel: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    panelTitle: { ...typography.subtitle, color: colors.text },
    group: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    groupLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    groupTitle: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 2,
      marginTop: spacing.xs,
    },
    row: { gap: 2, paddingVertical: 3 },
    rowLabel: { ...typography.caption, color: colors.textMuted },
    rowValue: { ...typography.body, color: colors.text },
    rowEmpty: { color: colors.textMuted },
  });
}
