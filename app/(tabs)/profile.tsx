import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Search02Icon } from '@/components/icons/hugeicons';
import { getErrorMessage } from '@/api/client';
import { LogoutSheet } from '@/components/ui/LogoutSheet';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { APP_NAME, APP_VERSION } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { usePendingWriteCount } from '@/lib/accountWrites';
import {
  AccountSwitchSheet,
  SettingsSearchSheet,
  ThemeModeSheet,
  useSettingsPendingCount,
  type SettingsSearchItem,
} from '@/features/settings';
import {
  THEME_MODE_LABELS,
  useTheme,
  type ThemeColors,
} from '@/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type MoreChrome = {
  primary: string;
  primary50: string;
  surface: string;
  card: string;
  muted: string;
  icon: string;
  border: string;
  text: string;
  expense: string;
  expenseSoft: string;
  pressed: string;
  radius2xl: number;
  radiusFull: number;
  screenPad: number;
};

function makeMore(colors: ThemeColors): MoreChrome {
  return {
    primary: colors.brand,
    primary50: colors.primary50,
    surface: colors.background,
    card: colors.surface,
    muted: colors.textSecondary,
    icon: colors.textSecondary,
    border: colors.border,
    text: colors.text,
    expense: colors.danger,
    expenseSoft: colors.dangerSoft,
    pressed: colors.surfaceMuted,
    radius2xl: 16,
    radiusFull: 999,
    screenPad: 20,
  };
}

type MenuItem = {
  key: string;
  label: string;
  icon: IoniconName;
  href?: Href;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  showChevron?: boolean;
  soon?: boolean;
  /** Pending setup count badge on the row icon. */
  badge?: number;
};

type MenuSectionData = {
  key: string;
  title: string;
  items: MenuItem[];
};

type Styles = ReturnType<typeof createStyles>;

function MenuSection({
  title,
  items,
  onItemPress,
  more,
  styles,
}: {
  title: string;
  items: MenuItem[];
  onItemPress: (item: MenuItem) => void;
  more: MoreChrome;
  styles: Styles;
}) {
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
            more={more}
            styles={styles}
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
  more,
  styles,
}: {
  item: MenuItem;
  isLast: boolean;
  onPress: () => void;
  more: MoreChrome;
  styles: Styles;
}) {
  const iconColor = item.danger ? more.expense : more.primary;
  const labelColor = item.danger ? more.expense : more.text;
  const iconBg = item.danger ? more.expenseSoft : more.primary50;
  const showChevron = item.showChevron !== false && !item.danger;
  const a11y = item.value ? `${item.label}, ${item.value}` : item.label;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.iconSlot, { backgroundColor: iconBg }]}>
          <Ionicons name={item.icon} size={18} color={iconColor} />
          {item.badge != null && item.badge > 0 ? (
            <View style={styles.rowBadge}>
              <Text style={styles.rowBadgeText}>
                {item.badge > 99 ? '99+' : String(item.badge)}
              </Text>
            </View>
          ) : null}
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
              <Ionicons name="chevron-forward" size={16} color={more.muted} />
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

function maskEmail(email: string) {
  const at = email.indexOf('@');
  if (at <= 1) return email;
  const user = email.slice(0, at);
  const domain = email.slice(at);
  if (user.length <= 2) return `${user[0]}*${domain}`;
  return `${user[0]}${'*'.repeat(Math.min(user.length - 2, 4))}${user[user.length - 1]}${domain}`;
}

function ProfileScreen() {
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
  const { mode, colors } = useTheme();
  const more = useMemo(() => makeMore(colors), [colors]);
  const styles = useMemo(() => createStyles(more), [more]);
  const callSync = useCallSyncStatus();
  const pendingSetup = useSettingsPendingCount();
  const [accounts, setAccounts] = useState<SavedMobileAccount[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await getSavedAccounts());
  }, [getSavedAccounts]);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
      void refreshAccounts();
    }, [callSync.refresh, refreshAccounts])
  );

  const displayName = user?.name?.trim() || APP_NAME;
  const roleLabel = user?.designation?.name || user?.role || 'Agent';
  const contact = user?.email?.trim()
    ? maskEmail(user.email.trim())
    : user?.phone?.trim() || '';

  const unsynced = usePendingWriteCount(user?.id);
  const signOutMessage = unsynced
    ? `${unsynced} change${unsynced === 1 ? ' is' : 's are'} still waiting to sync. ` +
      'They stay on this device and sync the next time you sign in.'
    : 'End this session on this device? You can sign back in anytime.';

  const onConfirmSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setSignOutOpen(false);
    } catch (error) {
      setSigningOut(false);
      Alert.alert('Sign out failed', getErrorMessage(error));
    }
  }, [signOut, signingOut]);

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
      if (!canContinue(account)) {
        setAccountsOpen(false);
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
            {
              text: 'Sign in',
              onPress: () => {
                void prepareAddAccount().then(() =>
                  router.replace('/(auth)/login')
                );
              },
            },
          ]
        );
        return;
      }
      try {
        await switchToAccount(account.id);
        await refreshAccounts();
        setAccountsOpen(false);
      } catch (error) {
        Alert.alert('Unable to switch', getErrorMessage(error));
      }
    },
    [
      user?.id,
      canContinue,
      switchToAccount,
      refreshAccounts,
      onRemove,
      prepareAddAccount,
      router,
    ]
  );

  const onAddAccount = useCallback(() => {
    setAccountsOpen(false);
    void prepareAddAccount().then(() => router.replace('/(auth)/login'));
  }, [prepareAddAccount, router]);

  const onSignInAgain = useCallback(
    (account: SavedMobileAccount) => {
      setAccountsOpen(false);
      Alert.alert(
        'Sign in again',
        `${account.email} needs to sign in again on this device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onRemove(account),
          },
          {
            text: 'Sign in',
            onPress: () => {
              void prepareAddAccount().then(() =>
                router.replace('/(auth)/login')
              );
            },
          },
        ]
      );
    },
    [onRemove, prepareAddAccount, router]
  );

  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.id !== user?.id),
    [accounts, user?.id]
  );

  const accountsValue =
    otherAccounts.length > 0
      ? `${otherAccounts.length} saved`
      : 'This device';

  const sections: MenuSectionData[] = useMemo(
    () => [
      {
        key: 'account',
        title: 'Account',
        items: [
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
            key: 'callSync',
            label: 'Call sync',
            icon: 'phone-portrait-outline',
            href: '/call-sync/setup',
            value: callSync.label,
            badge: pendingSetup.items.includes('call-sync') ? 1 : 0,
          },
        ],
      },
      {
        key: 'preferences',
        title: 'Preferences',
        items: [
          {
            key: 'theme',
            label: 'Theme mode',
            icon: 'color-palette-outline',
            value: THEME_MODE_LABELS[mode],
            onPress: () => setThemeOpen(true),
          },
          {
            key: 'accounts',
            label: 'Accounts',
            icon: 'people-outline',
            value: accountsValue,
            onPress: () => setAccountsOpen(true),
          },
        ],
      },
      {
        key: 'security',
        title: 'Security',
        items: [
          {
            key: 'appSecurity',
            label: 'App security',
            icon: 'shield-outline',
            soon: true,
          },
          {
            key: 'devices',
            label: 'Manage devices',
            icon: 'phone-portrait-outline',
            soon: true,
          },
          {
            key: 'about',
            label: 'App info',
            icon: 'information-circle-outline',
            value: `v${APP_VERSION}`,
            href: '/settings/about',
          },
        ],
      },
      {
        key: 'support',
        title: 'Support',
        items: [
          {
            key: 'faqs',
            label: 'Help & FAQs',
            icon: 'help-circle-outline',
            soon: true,
          },
          {
            key: 'logout',
            label: 'Sign out',
            icon: 'log-out-outline',
            danger: true,
            showChevron: false,
            onPress: () => setSignOutOpen(true),
          },
        ],
      },
    ],
    [callSync.label, mode, accountsValue, pendingSetup.items]
  );

  const searchItems: SettingsSearchItem[] = useMemo(
    () =>
      sections.flatMap((section) =>
        section.items.map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon,
          value: item.value,
          sectionTitle: section.title,
          danger: item.danger,
        }))
      ),
    [sections]
  );

  function runItem(item: MenuItem) {
    if (item.soon) {
      Alert.alert(item.label, 'Coming soon');
      return;
    }
    if (item.onPress) {
      item.onPress();
      return;
    }
    // navigate: switch tabs / reuse stack screens (Hisab — no duplicate stacks).
    if (item.href) router.navigate(item.href);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Settings"
        showBack={false}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search settings"
            onPress={() => setSearchOpen(true)}
            style={({ pressed }) => [styles.searchBtn, pressed && styles.pressed]}
          >
            <HugeiconsIcon
              icon={Search02Icon}
              size={22}
              color={more.icon}
              strokeWidth={1.8}
            />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.screen}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit personal info"
          onPress={() => router.push('/settings/edit')}
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
        >
          <View style={styles.avatarRing}>
            <UserAvatar
              uri={user?.profilePhoto}
              name={displayName}
              size={56}
              muted
              style={styles.avatar}
            />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileComplete} numberOfLines={1}>
              {roleLabel}
            </Text>
            {contact ? (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {contact}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={more.muted} />
        </Pressable>

        {sections.map((section) => (
          <MenuSection
            key={section.key}
            title={section.title}
            items={section.items}
            onItemPress={runItem}
            more={more}
            styles={styles}
          />
        ))}
      </ScrollView>

      {searchOpen ? (
        <SettingsSearchSheet
          open
          onClose={() => setSearchOpen(false)}
          items={searchItems}
          onSelect={(item) => {
            const match = sections
              .flatMap((section) => section.items)
              .find((menuItem) => menuItem.key === item.key);
            if (match) runItem(match);
          }}
        />
      ) : null}

      <ThemeModeSheet open={themeOpen} onClose={() => setThemeOpen(false)} />

      <AccountSwitchSheet
        open={accountsOpen}
        currentId={user?.id}
        currentName={displayName}
        currentEmail={user?.email}
        currentPhoto={user?.profilePhoto}
        accounts={accounts}
        switching={switchingAccount}
        onClose={() => {
          if (!switchingAccount) setAccountsOpen(false);
        }}
        onSwitch={onSwitch}
        onAddAccount={onAddAccount}
        onRemove={(account) => {
          setAccountsOpen(false);
          onRemove(account);
        }}
        onSignInAgain={onSignInAgain}
        onSignOut={() => {
          setAccountsOpen(false);
          setSignOutOpen(true);
        }}
      />

      <LogoutSheet
        open={signOutOpen}
        title="Sign out"
        message={signOutMessage}
        buttonLabel="Sign out"
        loading={signingOut}
        onClose={() => {
          if (!signingOut) setSignOutOpen(false);
        }}
        onConfirm={() => void onConfirmSignOut()}
      />
    </View>
  );
}

export default memo(ProfileScreen);

function createStyles(more: MoreChrome) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: more.surface,
    },
    searchBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
      backgroundColor: more.surface,
    },
    screen: {
      flexGrow: 1,
      paddingHorizontal: more.screenPad,
      paddingBottom: 32,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: more.card,
      borderRadius: more.radius2xl,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: more.border,
    },
    avatarRing: {
      width: 56,
      height: 56,
      borderRadius: more.radiusFull,
      borderWidth: 2,
      borderColor: more.border,
      marginRight: 14,
      overflow: 'hidden',
      backgroundColor: more.pressed,
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    profileText: {
      flex: 1,
      minWidth: 0,
    },
    profileName: {
      fontWeight: '700',
      fontSize: 17,
      lineHeight: 24,
      color: more.text,
    },
    profileComplete: {
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 18,
      color: more.muted,
      marginTop: 2,
    },
    profileEmail: {
      fontWeight: '400',
      fontSize: 12,
      lineHeight: 16,
      color: more.muted,
      marginTop: 2,
    },
    section: {
      marginBottom: 22,
    },
    sectionTitle: {
      fontWeight: '500',
      fontSize: 13,
      lineHeight: 18,
      color: more.muted,
      marginBottom: 8,
      marginLeft: 16,
    },
    card: {
      backgroundColor: more.card,
      borderRadius: more.radius2xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: more.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingLeft: 16,
      paddingRight: 14,
      backgroundColor: more.card,
    },
    iconSlot: {
      width: 32,
      height: 32,
      marginRight: 12,
      borderRadius: more.radiusFull,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBadge: {
      position: 'absolute',
      top: -4,
      right: -6,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: more.radiusFull,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: more.primary,
      borderWidth: 1.5,
      borderColor: more.card,
    },
    rowBadgeText: {
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
      color: '#FFFFFF',
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
      fontWeight: '500',
      fontSize: 16,
      lineHeight: 22,
      color: more.text,
    },
    rowTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      marginLeft: 10,
      gap: 4,
    },
    rowValue: {
      fontWeight: '400',
      fontSize: 15,
      lineHeight: 20,
      color: more.muted,
      maxWidth: 110,
    },
    dividerTrack: {
      backgroundColor: more.card,
      paddingLeft: 60,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: more.border,
    },
    pressed: {
      backgroundColor: more.pressed,
    },
  });
}
