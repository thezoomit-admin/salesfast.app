import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/ui/UserAvatar';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { blue, radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

const MAX_VISIBLE_OTHERS = 2;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;

const AVATAR_TONES = [
  '#A78BFA',
  '#60A5FA',
  '#FBBF24',
  '#34D399',
  blue.indigo,
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
  onSignOut: () => void;
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

const AVATAR_RADIUS = 10;

function InitialsTile({ seed, label }: { seed: string; label: string }) {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: AVATAR_RADIUS,
        backgroundColor: toneFor(seed),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
        {initials(label)}
      </Text>
    </View>
  );
}

/** Bottom sheet — Google-style switch account. */
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
  onSignOut,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showAll, setShowAll] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const busyRef = useRef(false);
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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
  busyRef.current = busy;

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    setShowAll(false);
    setSwitchingId(null);
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    closingRef.current = false;
    if (notifyParent) onCloseRef.current();
  };

  const runCloseAnimation = (notifyParent: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_OFFSCREEN,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finishClose(notifyParent);
      else closingRef.current = false;
    });
  };

  const animateClose = () => {
    if (closingRef.current) return;
    runCloseAnimation(true);
  };

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      mountedRef.current = true;
      setMounted(true);
      translateY.setValue(SHEET_OFFSCREEN);
      backdropOp.setValue(0);
      const frame = requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOp, {
            toValue: 1,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!mountedRef.current || closingRef.current) return;
    // Parent flipped `open` off — slide down, don't notify again.
    runCloseAnimation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !busyRef.current && !closingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !busyRef.current &&
          !closingRef.current &&
          g.dy > 4 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const shouldDismiss =
            g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
          if (shouldDismiss) {
            runCloseAnimation(true);
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    // finishClose uses refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateY, backdropOp]
  );

  const handlePress = (item: ListItem) => {
    if (item.isCurrent) {
      animateClose();
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

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={animateClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.backdropHit} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <Text style={styles.title}>Switch account</Text>
          </View>
          <ScrollView
            style={styles.listScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {listItems.map((item) => {
              const isSwitching = switchingId === item.id;
              return (
                <Pressable
                  key={item.id}
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
                    item.account ? () => onRemove(item.account!) : undefined
                  }
                  delayLongPress={420}
                  style={({ pressed }) => [
                    styles.accountRow,
                    pressed && !busy && styles.pressed,
                  ]}
                >
                  {item.isCurrent ? (
                    <UserAvatar
                      uri={item.photo}
                      name={item.name}
                      size={40}
                      muted
                      style={{ borderRadius: AVATAR_RADIUS }}
                    />
                  ) : (
                    <InitialsTile
                      seed={item.id || item.email}
                      label={item.name}
                    />
                  )}
                  <View style={styles.rowMeta}>
                    <Text
                      style={[
                        styles.name,
                        !item.isCurrent && styles.nameMuted,
                      ]}
                      numberOfLines={1}
                    >
                      {isSwitching ? 'Switching…' : item.name}
                    </Text>
                    {item.email ? (
                      <Text
                        style={[
                          styles.email,
                          !item.isCurrent && styles.emailMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {item.signedOut
                          ? `${item.email} · Signed out`
                          : item.email}
                      </Text>
                    ) : null}
                  </View>
                  {isSwitching ? (
                    <ActivityIndicator color={colors.brand} size="small" />
                  ) : null}
                </Pressable>
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
            </Pressable>
          ) : null}

          {showAll && otherAccounts.length > MAX_VISIBLE_OTHERS ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll(false)}
              style={({ pressed }) => [
                styles.viewAll,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.showLessText}>Show less</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add account"
            disabled={busy}
            onPress={onAddAccount}
            style={({ pressed }) => [
              styles.addBtn,
              pressed && !busy && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
            <Text style={styles.addLabel}>Add account</Text>
          </Pressable>

          <Text style={styles.longPressHint}>
            Long-press an account to remove it from this device
          </Text>

          <View style={styles.footerRule} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            disabled={busy}
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.footerRow,
              pressed && !busy && styles.pressed,
            ]}
          >
            <Ionicons
              name="exit-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.footerLabel}>Log out</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    backdropFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: {
      flex: 1,
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
    dragZone: {
      paddingTop: 2,
      paddingBottom: 4,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: 14,
      backgroundColor: colors.border,
    },
    title: {
      ...typography.subtitle,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      paddingHorizontal: 2,
    },
    listScroll: {
      maxHeight: 220,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 10,
      paddingHorizontal: 2,
    },
    rowMeta: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...typography.subtitle,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    nameMuted: {
      fontWeight: '500',
      color: colors.textSecondary,
    },
    email: {
      ...typography.caption,
      marginTop: 2,
      fontSize: 13,
      fontWeight: '400',
      color: colors.textSecondary,
    },
    emailMuted: {
      color: colors.textMuted,
    },
    viewAll: {
      paddingVertical: 10,
      paddingHorizontal: 2,
    },
    viewAllText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.brand,
    },
    showLessText: {
      ...typography.caption,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    addBtn: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    addLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    longPressHint: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '400',
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 14,
      marginBottom: 2,
      paddingHorizontal: 8,
    },
    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 12,
      marginBottom: 4,
      marginHorizontal: -spacing.lg,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 2,
    },
    footerLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
