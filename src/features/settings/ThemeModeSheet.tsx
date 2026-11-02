import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  THEME_MODE_LABELS,
  radii,
  spacing,
  typography,
  useTheme,
  type ThemeMode,
} from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  open: boolean;
  onClose: () => void;
};

const OPTIONS: {
  mode: ThemeMode;
  icon: IoniconName;
  hint: string;
}[] = [
  {
    mode: 'light',
    icon: 'sunny-outline',
    hint: 'Always use light appearance',
  },
  {
    mode: 'dark',
    icon: 'moon-outline',
    hint: 'Always use dark appearance',
  },
  {
    mode: 'system',
    icon: 'phone-portrait-outline',
    hint: 'Match your device setting',
  },
];

/** Bottom sheet — Light / Dark / System. */
export function ThemeModeSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { mode, colors, setMode } = useTheme();

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
              shadowColor: colors.black,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Theme mode
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose how Salesfast looks on this device
            </Text>
          </View>

          <View
            style={[
              styles.group,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {OPTIONS.map((option, index) => {
              const selected = mode === option.mode;
              return (
                <View key={option.mode}>
                  {index > 0 ? (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={THEME_MODE_LABELS[option.mode]}
                    onPress={() => {
                      setMode(option.mode);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.row,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.iconSlot,
                        {
                          backgroundColor: selected
                            ? colors.primary50
                            : colors.surfaceMuted,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={selected ? colors.brand : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.rowMeta}>
                      <Text style={[styles.rowLabel, { color: colors.text }]}>
                        {THEME_MODE_LABELS[option.mode]}
                      </Text>
                      <Text
                        style={[styles.rowHint, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {option.hint}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.brand}
                      />
                    ) : (
                      <View style={styles.checkPlaceholder} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 4,
  },
  group: {
    borderRadius: radii.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    ...typography.subtitle,
    fontSize: 15,
  },
  rowHint: {
    ...typography.caption,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
  },
  cancelBtn: {
    marginTop: spacing.md,
    marginBottom: 4,
    paddingVertical: 14,
    borderRadius: radii.md,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.subtitle,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
});
