import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HomeSection } from '@/components/home/HomeSection';
import {
  isDraftStatus,
  leadStatusesQuery,
  leadTabCountsQuery,
} from '@/features/leads/leadsApi';
import { requestTabIntent } from '@/lib/tabIntent';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

const CIRCLE = 56;

/** Lead count per stage, each opening that stage's tab on the Leads screen. */
export function HomePipelineStages() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  // Same caches as the Leads screen and the tab badge, so no extra request.
  const statuses = useQuery(leadStatusesQuery);
  const counts = useQuery(leadTabCountsQuery(''));

  const stages = useMemo(
    () =>
      (Array.isArray(statuses.data) ? statuses.data : []).filter(
        (s) => !isDraftStatus(s)
      ),
    [statuses.data]
  );

  if (stages.length === 0) return null;

  return (
    <HomeSection
      title="Pipeline"
      onSeeAll={() => router.navigate('/(tabs)/leads')}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.slider}
        contentContainerStyle={styles.row}
      >
        {stages.map((stage) => {
          const count = counts.data?.byStatus[stage.id] ?? 0;
          return (
            <Pressable
              key={stage.id}
              accessibilityRole="button"
              accessibilityLabel={`${stage.name}: ${count} leads`}
              onPress={() => {
                requestTabIntent({ screen: 'leads', value: String(stage.id) });
                router.navigate('/(tabs)/leads');
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.circle,
                  { borderColor: stage.color || colors.brand },
                ]}
              >
                <Text style={styles.count} numberOfLines={1}>
                  {count}
                </Text>
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {stage.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </HomeSection>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    slider: { marginHorizontal: -spacing.lg },
    row: { gap: 4, paddingHorizontal: spacing.lg - 6 },
    pressed: { opacity: 0.7 },
    item: {
      width: 74,
      alignItems: 'center',
      gap: 8,
    },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: colors.surface,
    },
    count: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '700',
      color: colors.text,
    },
    label: {
      ...typography.caption,
      lineHeight: 18,
      color: colors.text,
      textAlign: 'center',
    },
  });
}
