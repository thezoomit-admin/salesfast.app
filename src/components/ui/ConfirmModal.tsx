import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { radii, typography, useThemeColors, type ThemeColors } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** Destructive (sign out / delete) styling. */
  destructive?: boolean;
  icon?: IoniconName;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Hisab ConfirmModal — centered card + cancel / confirm. */
export function ConfirmModal({
  open,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel,
  destructive = false,
  icon,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconName =
    icon ?? (destructive ? 'log-out-outline' : 'alert-circle-outline');
  const iconColor = destructive ? colors.danger : colors.brand;
  const iconBg = destructive ? colors.dangerSoft : colors.primary50;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={loading ? undefined : onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        />
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={28} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.btn,
                styles.cancelBtn,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
                pressed && styles.pressed,
                loading && styles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 16,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      ...typography.subtitle,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      alignSelf: 'stretch',
    },
    btn: {
      flex: 1,
      borderRadius: radii.sm,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    cancelBtn: {
      backgroundColor: colors.background,
    },
    confirmBtn: {
      backgroundColor: colors.brand,
    },
    destructiveBtn: {
      backgroundColor: colors.danger,
    },
    cancelText: {
      ...typography.subtitle,
      fontSize: 15,
      color: colors.text,
    },
    confirmText: {
      ...typography.subtitle,
      fontSize: 15,
      color: colors.white,
    },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.55,
    },
  });
}
