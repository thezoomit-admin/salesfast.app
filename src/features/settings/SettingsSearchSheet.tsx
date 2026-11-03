import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Search02Icon } from '@/components/icons/hugeicons';
import { typography, useThemeColors, type ThemeColors } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const RADIUS_XL = 12;

export type SettingsSearchItem = {
  key: string;
  label: string;
  icon: IoniconName;
  value?: string;
  sectionTitle: string;
  danger?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: SettingsSearchItem[];
  onSelect: (item: SettingsSearchItem) => void;
};

/** Hisab SettingsSearchSheet — same bottom-sheet chrome. */
export function SettingsSearchSheet({ open, onClose, items, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = item.label.toLowerCase();
      const value = (item.value ?? '').toLowerCase();
      return (
        label.includes(q) ||
        value.includes(q) ||
        item.sectionTitle.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.searchRow}>
            <HugeiconsIcon
              icon={Search02Icon}
              size={18}
              color={colors.textSecondary}
              strokeWidth={1.8}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search settings"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={styles.input}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
            <Pressable onPress={close} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            contentContainerStyle={styles.listContent}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>No matching settings</Text>
            ) : (
              filtered.map((item) => {
                const iconColor = item.danger ? colors.danger : colors.brand;
                const labelColor = item.danger ? colors.danger : colors.text;
                const iconBg = item.danger ? colors.dangerSoft : colors.primary50;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      close();
                      onSelect(item);
                    }}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={[styles.iconSlot, { backgroundColor: iconBg }]}>
                      <Ionicons name={item.icon} size={18} color={iconColor} />
                    </View>
                    <View style={styles.meta}>
                      <Text
                        style={[styles.rowTitle, { color: labelColor }]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {item.sectionTitle}
                        {item.value ? ` · ${item.value}` : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.brand}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: RADIUS_XL,
      borderTopRightRadius: RADIUS_XL,
      maxHeight: '78%',
      paddingTop: 10,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: RADIUS_XL,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      marginBottom: 8,
    },
    input: {
      ...typography.body,
      flex: 1,
      color: colors.text,
      padding: 0,
      borderWidth: 0,
      ...(Platform.OS === 'web'
        ? ({
            outlineStyle: 'none',
            outlineWidth: 0,
            boxShadow: 'none',
          } as object)
        : null),
    },
    cancel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.brand,
    },
    list: {
      flexGrow: 0,
    },
    listContent: {
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    empty: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 28,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: RADIUS_XL,
    },
    iconSlot: {
      width: 32,
      height: 32,
      borderRadius: 999,
      backgroundColor: colors.primary50,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      flexShrink: 0,
    },
    meta: {
      flex: 1,
      minWidth: 0,
      marginRight: 10,
    },
    rowTitle: {
      ...typography.body,
      color: colors.text,
    },
    rowSub: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    pressed: {
      opacity: 0.85,
    },
  });
}
