import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter, type Href } from 'expo-router';
import { memo, useMemo, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { homeTints } from '@/components/home/HomeSection';
import {
  Notification01Icon,
  SmartPhone01Icon,
  UserAdd01Icon,
} from '@/components/icons/hugeicons';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

type Tip = {
  key: string;
  text: string;
  icon: ComponentProps<typeof HugeiconsIcon>['icon'];
  tint: keyof ReturnType<typeof homeTints>;
  href: Href;
};

const TIPS: Tip[] = [
  {
    key: 'call-sync',
    text: 'Turn on call sync to log every call',
    icon: SmartPhone01Icon,
    tint: 'ice',
    href: '/call-sync/setup',
  },
  {
    key: 'alerts',
    text: 'Set alerts so no follow-up slips away',
    icon: Notification01Icon,
    tint: 'lime',
    href: '/settings/notifications',
  },
  {
    key: 'add-lead',
    text: 'Add a new lead in a few taps',
    icon: UserAdd01Icon,
    tint: 'aqua',
    href: '/leads/new',
  },
];

function HomeTipsBase() {
  const { colors, resolved } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tints = homeTints(colors, resolved === 'dark');
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.slider}
      contentContainerStyle={styles.row}
    >
      {TIPS.map((tip) => (
        <Pressable
          key={tip.key}
          accessibilityRole="button"
          accessibilityLabel={tip.text}
          onPress={() => router.navigate(tip.href)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: tints[tip.tint] },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.text} numberOfLines={3}>
            {tip.text}
          </Text>
          <View style={styles.icon}>
            <HugeiconsIcon
              icon={tip.icon}
              size={44}
              color={colors.brand}
              strokeWidth={1.3}
            />
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export const HomeTips = memo(HomeTipsBase);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    slider: { marginHorizontal: -spacing.lg },
    row: { gap: 10, paddingHorizontal: spacing.lg },
    pressed: { opacity: 0.8 },
    card: {
      width: 170,
      minHeight: 124,
      justifyContent: 'space-between',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      ...typography.subtitle,
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
    },
    icon: { alignSelf: 'flex-end' },
  });
}
