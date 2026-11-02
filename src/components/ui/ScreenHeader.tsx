import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, typography } from '@/theme';

type Props = {
  title: string;
  /** Soft line under the title (tab roots). Ignored when centered. */
  subtitle?: string;
  /** Center slot (e.g. filter pill). Stays truly centered. */
  center?: ReactNode;
  /** Right slot (e.g. actions). Always far-right. */
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  /**
   * Wallet-style: back left, title dead-center, actions right.
   * Defaults on when `showBack` and no `center` slot.
   */
  titleCentered?: boolean;
};

/**
 * Shared page header — Hisab ScreenHeader pattern, Salesfast brand tokens.
 * - Tab root (`showBack={false}`): left title + right actions
 * - Stack (`titleCentered`): back | centered title | right
 */
export function ScreenHeader({
  title,
  subtitle,
  center,
  right,
  onBack,
  showBack = true,
  titleCentered,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const centered = titleCentered ?? (showBack && !center);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    try {
      if (typeof router.canDismiss === 'function' && router.canDismiss()) {
        router.dismiss(1);
        return;
      }
    } catch {
      // fall through
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace('/(tabs)');
  };

  const backControl = showBack ? (
    <Pressable
      onPress={handleBack}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Ionicons name="arrow-back" size={22} color={colors.text} />
    </Pressable>
  ) : null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {center || centered ? (
        <View
          style={[styles.centerSlot, { top: insets.top }]}
          pointerEvents="box-none"
        >
          {center ?? (
            <Text style={styles.titleCentered} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.sideRow}>
        {centered ? (
          <>
            <View style={styles.side}>
              {backControl ?? <View style={styles.iconBtn} />}
            </View>
            <View style={styles.sideEnd}>{right}</View>
          </>
        ) : (
          <>
            <View style={styles.leftWithTitle}>
              {backControl}
              <View style={styles.titleBlock}>
                <Text
                  style={[styles.titleInline, !showBack && styles.titleRoot]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle && !centered ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.right}>{right ?? <View style={styles.iconBtn} />}</View>
          </>
        )}
      </View>
    </View>
  );
}

export function HeaderAddButton({
  onPress,
  label,
}: {
  onPress: () => void;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
    >
      <Ionicons name="add" size={24} color={colors.white} />
    </Pressable>
  );
}

export function HeaderIconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#FDDFCF',
    zIndex: 2,
  },
  centerSlot: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    pointerEvents: 'box-none',
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  side: {
    minWidth: 40,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideEnd: {
    minWidth: 40,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  leftWithTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 8,
    maxWidth: '72%',
  },
  titleBlock: {
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInline: {
    ...typography.subtitle,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
    flexShrink: 1,
  },
  titleRoot: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  titleCentered: {
    ...typography.subtitle,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    textAlign: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 40,
    gap: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
