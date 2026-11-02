import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { APP_NAME, APP_VERSION, API_BASE_URL } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { colors, radii, spacing, typography } from '@/theme';

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
    const list = await getSavedAccounts();
    setAccounts(list);
  }, [getSavedAccounts]);

  useFocusEffect(
    useCallback(() => {
      void callSync.refresh();
      void refreshAccounts();
    }, [callSync.refresh, refreshAccounts])
  );

  const confirmSignOut = () => {
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
  };

  const onSwitch = async (accountId: string) => {
    if (accountId === user?.id) return;
    setSwitchError(null);
    try {
      await switchToAccount(accountId);
      await refreshAccounts();
    } catch (error) {
      setSwitchError(getErrorMessage(error, 'Unable to switch account'));
    }
  };

  const onRemove = (account: SavedMobileAccount) => {
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
  };

  const canContinue = (a: SavedMobileAccount) =>
    !a.signedOut && Boolean(a.accessToken && a.refreshToken);

  return (
    <Screen scroll>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        <Text style={styles.meta}>
          {user?.designation?.name || user?.role || 'Agent'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Accounts on this device</Text>
        <Text style={styles.meta}>
          Switch between admin-provisioned logins saved on this phone.
        </Text>

        {accounts.length === 0 ? (
          <Text style={styles.meta}>Only this session is active.</Text>
        ) : (
          accounts.map((account) => {
            const isActive = account.id === user?.id;
            return (
              <View key={account.id} style={styles.accountRow}>
                <View style={styles.accountMeta}>
                  <Text style={styles.accountName} numberOfLines={1}>
                    {account.name}
                    {isActive ? ' · current' : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {account.email}
                    {account.signedOut ? ' · signed out' : ''}
                  </Text>
                </View>
                {!isActive && canContinue(account) ? (
                  <Pressable
                    disabled={switchingAccount}
                    onPress={() => void onSwitch(account.id)}
                    style={styles.switchBtn}
                  >
                    {switchingAccount ? (
                      <ActivityIndicator color={colors.accent} />
                    ) : (
                      <Text style={styles.switchBtnText}>Switch</Text>
                    )}
                  </Pressable>
                ) : null}
                {!isActive ? (
                  <Pressable
                    onPress={() => onRemove(account)}
                    hitSlop={6}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}

        {switchError ? <Text style={styles.error}>{switchError}</Text> : null}

        <Button
          title="Add another account"
          variant="secondary"
          onPress={() => {
            void prepareAddAccount().then(() =>
              router.replace('/(auth)/login')
            );
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Device & sync</Text>
        <Text style={styles.meta}>Status: {callSync.label}</Text>
        <Text style={styles.meta}>{callSync.message}</Text>
        <Button
          title={
            callSync.status === 'not_configured'
              ? 'Configure call sync'
              : 'Manage call sync'
          }
          variant="secondary"
          onPress={() => router.push('/call-sync/setup')}
        />
        <Text style={styles.meta}>
          App: {APP_NAME} v{APP_VERSION}
        </Text>
        <Text style={styles.meta} numberOfLines={2}>
          API: {API_BASE_URL}
        </Text>
      </View>

      <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  name: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.body, color: colors.textSecondary },
  section: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  switchBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
  },
  switchBtnText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  removeBtn: {
    paddingHorizontal: 4,
  },
  removeText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
