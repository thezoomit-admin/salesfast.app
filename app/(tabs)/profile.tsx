import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { APP_NAME, APP_VERSION, API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { colors, radii, spacing, typography } from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type MenuItem = {
  key: string;
  label: string;
  icon: IoniconName;
  href?: Href;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
  loading?: boolean;
};

type MenuSectionData = {
  key: string;
  title: string;
  items: MenuItem[];
};

function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function MenuSection({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: MenuItem[];
  onItemPress: (item: MenuItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <MenuRow
            key={item.key}
            item={item}
            isLast={index === items.length - 1}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: MenuItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const iconColor = item.danger ? colors.danger : colors.brand;
  const labelColor = item.danger ? colors.danger : colors.text;
  const iconBg = item.danger ? colors.dangerSoft : colors.primary50;
  const showChevron = item.showChevron !== false && !item.danger;
  const a11y = item.value ? `${item.label}, ${item.value}` : item.label;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        disabled={item.loading}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.iconSlot, { backgroundColor: iconBg }]}>
          {item.loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={item.icon} size={18} color={iconColor} />
          )}
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowLabel, { color: labelColor }]} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.rowTrailing}>
            {item.value ? (
              <Text style={styles.rowValue} numberOfLines={1}>
                {item.value}
              </Text>
            ) : null}
            {showChevron ? (
              <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
            ) : null}
          </View>
        </View>
      </Pressable>
      {!isLast ? (
        <View style={styles.dividerTrack} pointerEvents="none">
          <View style={styles.divider} />
        </View>
      ) : null}
    </>
  );
}

export default function ProfileScreen() {
  const {
    user,
    signOut,
    prepareAddAccount,
    switchToAccount,
    switchingAccount,
    removeAccount,
    getSavedAccounts,
  } = useAuth();
  const router = useRouter();
  const callSync = useCallSyncStatus();
  const [accounts, setAccounts] = useState<SavedMobileAccount[]>([]);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await getSavedAccounts());
  }, [getSavedAccounts]);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
      void refreshAccounts();
    }, [callSync.refresh, refreshAccounts])
  );

  const displayName = user?.name?.trim() || 'Agent';
  const roleLabel = user?.designation?.name || user?.role || 'Agent';
  const contact = user?.email?.trim() || user?.phone?.trim() || '';

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sign out', 'End this session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOut();
        },
      },
    ]);
  }, [signOut]);

  const canContinue = useCallback(
    (a: SavedMobileAccount) =>
      !a.signedOut && Boolean(a.accessToken && a.refreshToken),
    []
  );

  const onRemove = useCallback(
    (account: SavedMobileAccount) => {
      Alert.alert(
        'Remove account',
        `Remove ${account.name} from this device? You can sign in again later.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void removeAccount(account.id).then(() => refreshAccounts());
            },
          },
        ]
      );
    },
    [removeAccount, refreshAccounts]
  );

  const onSwitch = useCallback(
    async (account: SavedMobileAccount) => {
      if (account.id === user?.id) return;
      setSwitchError(null);
      if (!canContinue(account)) {
        Alert.alert(
          'Session expired',
          'Sign in again to use this account, or remove it from this device.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => onRemove(account),
            },
          ]
        );
        return;
      }
      try {
        await switchToAccount(account.id);
        await refreshAccounts();
      } catch (error) {
        setSwitchError(getErrorMessage(error, 'Unable to switch account'));
      }
    },
    [user?.id, canContinue, switchToAccount, refreshAccounts, onRemove]
  );

  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.id !== user?.id),
    [accounts, user?.id]
  );

  const sections: MenuSectionData[] = useMemo(() => {
    const accountItems: MenuItem[] = [
      {
        key: 'notifications',
        label: 'Notifications',
        icon: 'notifications-outline',
        href: '/notifications',
      },
      {
        key: 'activities',
        label: 'Activities',
        icon: 'list-outline',
        href: '/activities',
      },
      {
        key: 'addAccount',
        label: 'Add another account',
        icon: 'person-add-outline',
        onPress: () => {
          void prepareAddAccount().then(() => router.replace('/(auth)/login'));
        },
      },
    ];

    const switchItems: MenuItem[] = otherAccounts.map((account) => ({
      key: `account-${account.id}`,
      label: account.name,
      icon: 'swap-horizontal-outline' as IoniconName,
      value: account.signedOut ? 'Signed out' : account.email,
      loading: switchingAccount,
      onPress: () => {
        Alert.alert(account.name, account.email, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemove(account),
          },
          {
            text: 'Switch',
            onPress: () => void onSwitch(account),
          },
        ]);
      },
    }));

    return [
      { key: 'account', title: 'Account', items: accountItems },
      ...(switchItems.length
        ? [{ key: 'accounts', title: 'Accounts on this device', items: switchItems }]
        : []),
      {
        key: 'device',
        title: 'Device & sync',
        items: [
          {
            key: 'callSync',
            label: 'Call sync',
            icon: 'phone-portrait-outline',
            href: '/call-sync/setup',
            value: callSync.label,
          },
        ],
      },
      {
        key: 'about',
        title: 'About',
        items: [
          {
            key: 'version',
            label: APP_NAME,
            icon: 'information-circle-outline',
            value: `v${APP_VERSION}`,
            showChevron: false,
            onPress: () => {
              Alert.alert(
                APP_NAME,
                `Version ${APP_VERSION}\n\nAPI\n${API_BASE_URL}`
              );
            },
          },
        ],
      },
      {
        key: 'session',
        title: 'Session',
        items: [
          {
            key: 'logout',
            label: 'Sign out',
            icon: 'log-out-outline',
            danger: true,
            showChevron: false,
            onPress: confirmSignOut,
          },
        ],
      },
    ];
  }, [
    otherAccounts,
    callSync.label,
    switchingAccount,
    prepareAddAccount,
    router,
    onSwitch,
    onRemove,
    confirmSignOut,
  ]);

  const runItem = (item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
      return;
    }
    if (item.href) router.push(item.href);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="More" showBack={false} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileRole} numberOfLines={1}>
              {roleLabel}
            </Text>
            {contact ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {contact}
              </Text>
            ) : null}
          </View>
        </View>

        {switchError ? <Text style={styles.error}>{switchError}</Text> : null}

        {sections.map((section) => (
          <MenuSection
            key={section.key}
            title={section.title}
            items={section.items}
            onItemPress={runItem}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDDFCF',
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.brand,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary50,
  },
  avatarText: {
    ...typography.subtitle,
    fontSize: 18,
    color: colors.brand,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    ...typography.subtitle,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  profileRole: {
    ...typography.caption,
    color: colors.brand,
    marginTop: 2,
  },
  profileEmail: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 14,
    backgroundColor: colors.surface,
  },
  iconSlot: {
    width: 32,
    height: 32,
    marginRight: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
    ...typography.subtitle,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 10,
    gap: 4,
  },
  rowValue: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    maxWidth: 120,
  },
  dividerTrack: {
    backgroundColor: colors.surface,
    paddingLeft: 60,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.primary50,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
  },
});
