import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '@/theme';

type Props = {
  open: boolean;
  hasPhoto: boolean;
  onClose: () => void;
  onLibrary: () => void;
  onCamera: () => void;
  onRemove: () => void;
};

/** Hisab PhotoChangeSheet — same bottom-sheet chrome. */
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
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.title}>Change photo</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onLibrary();
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text style={styles.itemText}>Choose from library</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onClose();
              onCamera();
            }}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text style={styles.itemText}>Take photo</Text>
          </Pressable>

          {hasPhoto ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onClose();
                onRemove();
              }}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <Text style={[styles.itemText, styles.destructive]}>Remove photo</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
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
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  itemText: {
    color: colors.text,
    fontSize: 15,
  },
  destructive: {
    color: colors.danger,
  },
  cancelBtn: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
});
