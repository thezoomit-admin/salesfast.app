import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
  type Href,
} from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Calendar03Icon,
  CallIcon,
  EyeIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { spacing, useThemeColors, type ThemeColors } from '@/theme';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

type TabKey = 'index' | 'history' | 'calls' | 'views';

const TABS: {
  key: TabKey;
  label: string;
  icon: HugeIconData;
  path: (id: string) => Href;
  match: (pathname: string) => boolean;
}[] = [
  {
    key: 'index',
    label: 'Overview',
    icon: UserIcon,
    path: (id) => `/leads/${id}` as Href,
    match: (p) =>
      /\/leads\/[^/]+\/?$/.test(p) || /\/leads\/[^/]+\/index\/?$/.test(p),
  },
  {
    key: 'history',
    label: 'History',
    icon: Calendar03Icon,
    path: (id) => `/leads/${id}/history` as Href,
    match: (p) => /\/leads\/[^/]+\/history\/?$/.test(p),
  },
  {
    key: 'calls',
    label: 'Call History',
    icon: CallIcon,
    path: (id) => `/leads/${id}/calls` as Href,
    match: (p) => /\/leads\/[^/]+\/calls\/?$/.test(p),
  },
  {
    key: 'views',
    label: 'View History',
    icon: EyeIcon,
    path: (id) => `/leads/${id}/views` as Href,
    match: (p) => /\/leads\/[^/]+\/views\/?$/.test(p),
  },
];

const TAB_BAR_CONTENT_HEIGHT = 56;

/** Dedicated bottom menu — navigates via expo-router (no RN tab navigation prop). */
export function LeadDetailTabBar() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const pathname = usePathname();
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = String(id ?? '');

  const activeKey =
    TABS.find((t) => t.match(pathname))?.key ?? ('index' as TabKey);

  return (
    <View
      style={[
        styles.bar,
        {
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = activeKey === tab.key;
        const tint = isActive ? colors.brand : colors.textMuted;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            disabled={!leadId}
            onPress={() => {
              if (!leadId || isActive) return;
              // replace → tab switches don't stack on the back stack
              router.replace(tab.path(leadId));
            }}
            style={styles.item}
          >
            <HugeiconsIcon
              icon={tab.icon}
              size={22}
              color={tint}
              strokeWidth={1.8}
            />
            <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingHorizontal: spacing.xs,
    },
    label: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
