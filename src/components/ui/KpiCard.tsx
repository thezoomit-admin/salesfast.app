import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/src/theme';

export function KpiCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'warning' | 'accent';
}) {
  return (
    <View
      style={[
        styles.card,
        tone === 'warning' && styles.warning,
        tone === 'accent' && styles.accent,
      ]}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  warning: { backgroundColor: colors.warningSoft, borderColor: '#F5D08A' },
  accent: { backgroundColor: colors.brandSoft, borderColor: '#B7D4D4' },
  value: { ...typography.title, color: colors.text },
  label: { ...typography.caption, color: colors.textSecondary },
});
