import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { APP_NAME, APP_VERSION, API_BASE_URL } from '@/src/constants/config';
import { useAuth } from '@/src/features/auth/AuthContext';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

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
        <Text style={styles.section}>Device & sync</Text>
        <Text style={styles.meta}>
          Call synchronization is not configured. Automatic call-log sync requires a
          successful Phase 0 feasibility spike.
        </Text>
        <Text style={styles.meta}>App: {APP_NAME} v{APP_VERSION}</Text>
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
    gap: spacing.xs,
  },
  name: { ...typography.subtitle, color: colors.text },
  meta: { ...typography.body, color: colors.textSecondary },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.xs },
});
