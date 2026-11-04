import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { homeTints, HomeSection } from '@/components/home/HomeSection';
import {
  Calendar03Icon,
  CircleCheckIcon,
  UserAdd01Icon,
} from '@/components/icons/hugeicons';
import { typography, useTheme, type ThemeColors } from '@/theme';
import type { MobileDashboard } from '@/types/api';

type Props = {
  kpis: MobileDashboard['kpis'];
  recentLeads: MobileDashboard['recentLeads'];
};

type StatCard = {
  key: string;
  label: string;
  value: number;
  icon: ComponentProps<typeof HugeiconsIcon>['icon'];
  iconColor: string;
  background: string;
  href: Href;
};

const CHIP_COUNT = 3;

export function HomeQuickFeatures({ kpis, recentLeads }: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const tints = homeTints(colors, isDark);

  const cards: StatCard[] = [
    {
      key: 'new',
      label: 'New leads',
      value: kpis.newLeads,
      icon: UserAdd01Icon,
      iconColor: colors.brand,
      background: tints.cream,
      href: '/(tabs)/leads',
    },
    {
      key: 'open',
      label: 'Still open',
      value: kpis.pendingFollowUps,
      icon: Calendar03Icon,
      iconColor: isDark ? '#2DD4BF' : '#0F766E',
      background: tints.mint,
      href: '/(tabs)/follow-ups',
    },
    {
      key: 'done',
      label: 'Activities',
      value: kpis.completedActivities,
      icon: CircleCheckIcon,
      iconColor: colors.success,
      background: tints.lime,
      href: '/activities',
    },
  ];

  const chips = recentLeads.slice(0, CHIP_COUNT);

  return (
    <HomeSection title="Quick access">
      {chips.length > 0 ? (
        <View style={styles.row}>
          {chips.map((lead) => {
            const name = lead.name || 'Unnamed lead';
            return (
              <Pressable
                key={lead.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${name}`}
                onPress={() => router.push(`/leads/${lead.id}`)}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.chipMark,
                    { backgroundColor: lead.status?.color || colors.brand },
                  ]}
                >
                  <Text style={styles.chipInitial}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.chipName} numberOfLines={1}>
                  {name.trim().split(/\s+/)[0]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.row}>
        {cards.map((card) => (
          <Pressable
            key={card.key}
            accessibilityRole="button"
            accessibilityLabel={`${card.label}: ${card.value}`}
            onPress={() => router.navigate(card.href)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: card.background },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.cardTop}>
              <HugeiconsIcon
                icon={card.icon}
                size={26}
                color={card.iconColor}
                strokeWidth={1.6}
              />
              <Text style={styles.cardValue} numberOfLines={1}>
                {card.value}
              </Text>
            </View>
            <Text style={styles.cardLabel} numberOfLines={1}>
              {card.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </HomeSection>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    pressed: { opacity: 0.8 },
    chip: {
      flexBasis: 0,
      flexGrow: 1,
      maxWidth: '32%',
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipMark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    chipInitial: {
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    chipName: {
      ...typography.caption,
      flexShrink: 1,
      lineHeight: 18,
      color: colors.text,
    },
    card: {
      flex: 1,
      minWidth: 0,
      minHeight: 84,
      justifyContent: 'space-between',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    cardValue: {
      flexShrink: 1,
      fontSize: 20,
      lineHeight: 25,
      fontWeight: '700',
      color: colors.text,
    },
    cardLabel: {
      ...typography.caption,
      lineHeight: 18,
      color: colors.text,
    },
  });
}
