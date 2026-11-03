import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/ui/UserAvatar';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

const MAX_VISIBLE_OTHERS = 2;

const AVATAR_TONES = [
  '#111827',
  '#2563EB',
  '#F97316',
  '#7C3AED',
  '#059669',
];

type ListItem = {
  id: string;
  name: string;
  email: string;
  photo?: string | null;
  signedOut: boolean;
  isCurrent: boolean;
  account?: SavedMobileAccount;
};

type Props = {
  open: boolean;
  currentId?: string | null;
  currentName: string;
  currentEmail?: string;
  currentPhoto?: string | null;
  accounts: SavedMobileAccount[];
  switching?: boolean;
  onClose: () => void;
  onSwitch: (account: SavedMobileAccount) => void | Promise<void>;
  onAddAccount: () => void;
  onRemove: (account: SavedMobileAccount) => void;
  onSignInAgain: (account: SavedMobileAccount) => void;
};

function shortName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || name;
}

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[hash];
}

function initials(name: string) {
  const parts = shortName(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function InitialsDot({
  seed,
  label,
  size = 28,
}: {
  seed: string;
  label: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: toneFor(seed),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#fff',
          fontSize: size <= 28 ? 10 : 12,
          fontWeight: '700',
        }}
      >
        {initials(label)}
      </Text>
    </View>
  );
}

/** Bottom sheet — switch / add / remove saved accounts (web sidebar parity). */
export function AccountSwitchSheet({
  open,
  currentId,
  currentName,
  currentEmail = '',
  currentPhoto,
  accounts,
  switching = false,
  onClose,
  onSwitch,
  onAddAccount,
  onRemove,
  onSignInAgain,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setShowAll(false);
      setSwitchingId(null);
    }
  }, [open]);

  const currentEmailNorm = currentEmail.trim().toLowerCase();
  const displayName = shortName(currentName.trim() || 'User');

  const otherAccounts = useMemo(
    () =>
      accounts
        .filter((a) => {
          if (!a.email) return false;
          if (currentId && a.id === currentId) return false;
          if (
            currentEmailNorm &&
            a.email.trim().toLowerCase() === currentEmailNorm
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          const aLive = a.signedOut ? 0 : 1;
          const bLive = b.signedOut ? 0 : 1;
          if (aLive !== bLive) return bLive - aLive;
          return (
            new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
          );
        }),
    [accounts, currentId, currentEmailNorm]
  );

  const visibleOthers = showAll
    ? otherAccounts
    : otherAccounts.slice(0, MAX_VISIBLE_OTHERS);
  const hiddenCount = Math.max(0, otherAccounts.length - MAX_VISIBLE_OTHERS);

  const listItems: ListItem[] = useMemo(() => {
    const current: ListItem = {
      id: currentId || 'current',
      name: displayName,
      email: currentEmail,
      photo: currentPhoto,
      signedOut: false,
      isCurrent: true,
    };
    const others: ListItem[] = visibleOthers.map((a) => ({
      id: a.id,
      name: shortName(a.name),
      email: a.email,
      signedOut: Boolean(a.signedOut),
      isCurrent: false,
      account: a,
    }));
    return [current, ...others];
  }, [currentId, displayName, currentEmail, currentPhoto, visibleOthers]);

  const busy = switching || switchingId !== null;

  const handleClose = () => {
    if (busy) return;
    setShowAll(false);
    onClose();
  };

  const handlePress = (item: ListItem) => {
    if (item.isCurrent) {
      handleClose();
      return;
    }
    if (busy || !item.account) return;

    if (item.signedOut) {
      onSignInAgain(item.account);
      return;
    }

    setSwitchingId(item.id);
    void Promise.resolve(onSwitch(item.account)).finally(() => {
      setSwitchingId(null);
    });
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
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
            <Text style={styles.title}>Accounts</Text>
            <Text style={styles.subtitle}>
              Switch between accounts saved on this device
            </Text>
          </View>

          <View style={styles.card}>
            <ScrollView
              style={styles.listScroll}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {listItems.map((item, index) => {
                const isSwitching = switchingId === item.id;
                return (
                  <View key={item.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: item.isCurrent,
                        disabled: busy && !item.isCurrent,
                      }}
                      accessibilityLabel={
                        item.isCurrent
                          ? `${item.name}, current account`
                          : item.signedOut
                            ? `${item.name}, signed out`
                            : `Switch to ${item.name}`
                      }
                      disabled={busy && !item.isCurrent}
                      onPress={() => handlePress(item)}
                      onLongPress={
                        item.account
                          ? () => onRemove(item.account!)
                          : undefined
                      }
                      delayLongPress={420}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && !busy && styles.pressed,
                      ]}
                    >
                      {item.isCurrent ? (
                        <UserAvatar
                          uri={item.photo}
                          name={item.name}
                          size={28}
                          muted
                        />
                      ) : (
                        <InitialsDot
                          seed={item.id || item.email}
                          label={item.name}
                        />
                      )}
                      <View style={styles.rowMeta}>
                        <Text
                          style={[
                            styles.rowLabel,
                            item.isCurrent && styles.rowLabelCurrent,
                          ]}
                          numberOfLines={1}
                        >
                          {isSwitching ? 'Switching…' : item.name}
                        </Text>
                        {item.email ? (
                          <Text style={styles.rowHint} numberOfLines={1}>
                            {item.email}
                          </Text>
                        ) : null}
                      </View>
                      {isSwitching ? (
                        <ActivityIndicator color={colors.brand} size="small" />
                      ) : item.signedOut ? (
                        <Text style={styles.signedOut}>Signed out</Text>
                      ) : item.isCurrent ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={colors.brand}
                        />
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            {!showAll && hiddenCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAll(true)}
                style={({ pressed }) => [
                  styles.viewAll,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.viewAllText}>
                  View all ({otherAccounts.length})
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={colors.brand}
                />
              </Pressable>
            ) : null}

            {showAll && otherAccounts.length > MAX_VISIBLE_OTHERS ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAll(false)}
                style={({ pressed }) => [
                  styles.showLess,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.showLessText}>Show less</Text>
              </Pressable>
            ) : null}

            <View style={styles.addDivider} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add another account"
              disabled={busy}
              onPress={onAddAccount}
              style={({ pressed }) => [
                styles.addRow,
                pressed && !busy && styles.pressed,
              ]}
            >
              <View style={styles.addIcon}>
                <Ionicons
                  name="add"
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
              <Text style={styles.addLabel}>Add another account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(17, 24, 39, 0.4)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
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
      backgroundColor: colors.border,
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
      marginTop: 4,
      color: colors.textSecondary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    listScroll: {
      maxHeight: 320,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowMeta: {
      flex: 1,
      minWidth: 0,
    },
    rowLabel: {
      ...typography.subtitle,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    rowLabelCurrent: {
      fontWeight: '700',
      color: colors.text,
    },
    rowHint: {
      ...typography.caption,
      marginTop: 2,
      color: colors.textMuted,
    },
    signedOut: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 11,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 54,
      backgroundColor: colors.border,
    },
    viewAll: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    viewAllText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.brand,
    },
    showLess: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    showLessText: {
      ...typography.caption,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    addDivider: {
      height: StyleSheet.hairlineWidth,
      marginHorizontal: 12,
      backgroundColor: colors.border,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    addIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    addLabel: {
      ...typography.subtitle,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
