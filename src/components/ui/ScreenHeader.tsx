import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii, typography, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  title: string;
  /** Center slot (e.g. filter pill). Stays truly centered. */
  center?: ReactNode;
  /** Right slot (e.g. actions). Always far-right. */
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  /** Makes the inline title a button (with a chevron), e.g. a date picker. */
  onTitlePress?: () => void;
  /**
   * Wallet-style: back left, title dead-center, actions right.
   * Defaults on when `showBack` and no `center` slot.
   */
  titleCentered?: boolean;
};

/**
 * Shared page header — mirrors Hisab ScreenHeader layout.
 * - Tab root (`showBack={false}`): left title + right actions
 * - Stack (`titleCentered`): back | centered title | right
 */
export function ScreenHeader({
  title,
  center,
  right,
  onBack,
  showBack = true,
  onTitlePress,
  titleCentered,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
              {onTitlePress ? (
                <Pressable
                  onPress={onTitlePress}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.titleBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.titleInline, !showBack && styles.titleRoot]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.text} />
                </Pressable>
              ) : (
                <Text
                  style={[styles.titleInline, !showBack && styles.titleRoot]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
            </View>
            <View style={styles.right}>{right}</View>
          </>
        )}
      </View>
    </View>
  );
}

export function HeaderAddButton({
  onPress,
  label = 'Add',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.addBtn,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.addBtnLabel} numberOfLines={1}>
        + {label}
      </Text>
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      minHeight: 48,
      paddingHorizontal: 16,
      paddingBottom: 8,
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
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
      maxWidth: '70%',
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexShrink: 1,
      minWidth: 0,
    },
    titleInline: {
      fontSize: 17,
      lineHeight: 26,
      fontWeight: '700',
      color: colors.text,
      flexShrink: 1,
    },
    titleRoot: {
      fontSize: 20,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    titleCentered: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '700',
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      minHeight: 28,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
    },
    addBtnLabel: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      color: colors.white,
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.45,
    },
  });
}
