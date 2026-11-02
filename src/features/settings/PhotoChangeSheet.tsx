import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  open: boolean;
  hasPhoto: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onCamera: () => void;
  onRemove: () => void;
};

type ActionRowProps = {
  icon: IoniconName;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
};

function ActionRow({ icon, label, hint, danger, onPress }: ActionRowProps) {
  const iconColor = danger ? colors.danger : colors.brand;
  const iconBg = danger ? colors.dangerSoft : colors.primary50;
  const labelColor = danger ? colors.danger : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconSlot, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowMeta}>
        <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
        {hint ? (
          <Text style={styles.rowHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={danger ? colors.danger : colors.textMuted}
      />
    </Pressable>
  );
}

/** Bottom sheet for profile photo actions. */
export function PhotoChangeSheet({
  open,
  hasPhoto,
  onClose,
  onLibrary,
  onCamera,
  onRemove,
}: Props) {
  const insets = useSafeAreaInsets();

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
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Change photo</Text>
            <Text style={styles.subtitle}>
              Update how you appear across Salesfast
            </Text>
          </View>

          <View style={styles.group}>
            <ActionRow
              icon="images-outline"
              label="Choose from library"
              hint="Pick an existing photo"
              onPress={() => {
                onClose();
                onLibrary();
              }}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="camera-outline"
              label="Take photo"
              hint="Use your camera"
              onPress={() => {
                onClose();
                onCamera();
              }}
            />
          </View>

          {hasPhoto ? (
            <View style={[styles.group, styles.removeGroup]}>
              <ActionRow
                icon="trash-outline"
                label="Remove photo"
                hint="Use the default avatar"
                danger
                onPress={() => {
                  onClose();
                  onRemove();
                }}
              />
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: spacing.lg,
    shadowColor: '#111827',
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
    backgroundColor: '#D1D5DB',
    marginBottom: 14,
  },
  header: {
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  title: {
    ...typography.subtitle,
    fontSize: 18,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  removeGroup: {
    marginTop: spacing.sm,
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
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 62,
  },
  cancelBtn: {
    marginTop: spacing.md,
    marginBottom: 4,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.subtitle,
    fontSize: 15,
    color: colors.text,
  },
  pressed: {
    opacity: 0.88,
  },
});
