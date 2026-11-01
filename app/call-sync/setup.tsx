import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { isCallLogModuleAvailable } from 'android-call-log';

import { runCallSync } from '@/features/call-tracking/runCallSync';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import { colors, radii, spacing, typography } from '@/theme';

export default function CallSyncSetupScreen() {
  const router = useRouter();
  const { prefs, loading, update, label, message, status, refresh } =
    useCallSyncStatus();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const alreadyConfigured = !!prefs?.consentedAt && !!prefs?.enabled;

  useEffect(() => {
    if (alreadyConfigured) setAccepted(true);
  }, [alreadyConfigured]);

  const completeSetup = async () => {
    if (!accepted && !alreadyConfigured) {
      Alert.alert(
        'Consent required',
        'Please confirm you understand what call data will be processed.'
      );
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      await update({
        consentedAt: prefs?.consentedAt ?? now,
        // Epoch = no cutoff; older matched lead calls may sync too.
        syncFromAt: new Date(0).toISOString(),
        enabled: true,
        paused: false,
      });
      const nativeReady =
        Platform.OS === 'android' && isCallLogModuleAvailable();
      Alert.alert(
        'Call sync configured',
        Platform.OS === 'web'
          ? 'Preference saved. Open the Android development build for automatic sync.'
          : nativeReady
            ? 'Setup complete. Matched lead calls will sync when you open the app or tap Sync now.'
            : 'Consent saved. Expo Go cannot read call logs — install the Realist CRM development build, then tap Sync now.'
      );
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (paused: boolean) => {
    setSaving(true);
    try {
      await update({ paused });
    } finally {
      setSaving(false);
    }
  };

  const disableSync = async () => {
    setSaving(true);
    try {
      await update({ enabled: false, paused: false });
      Alert.alert('Disabled', 'Call sync preference turned off on this device.');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const result = await runCallSync({ force: true });
      await refresh();
      Alert.alert(result.ok ? 'Sync finished' : 'Sync blocked', result.message);
    } catch (e) {
      Alert.alert(
        'Sync failed',
        e instanceof Error ? e.message : 'Could not sync call history'
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Call synchronization</Text>
      <Text style={styles.body}>
        Match phone calls with your CRM leads and save activities automatically.
        Personal calls that do not match an authorized lead are never uploaded.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current status</Text>
        <Text style={styles.status}>{label}</Text>
        <Text style={styles.body}>{message}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What we process</Text>
        <Text style={styles.bullet}>• Phone number, call type, time, duration</Text>
        <Text style={styles.bullet}>• Only calls that match your CRM leads</Text>
        <Text style={styles.bullet}>• No call audio, SMS, or contacts access</Text>
        <Text style={styles.bullet}>
          • Recent call history is scanned; only numbers that match CRM leads upload
        </Text>
      </View>

      {!alreadyConfigured ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.body, { flex: 1 }]}>
              I understand and agree to call matching for CRM leads on this device.
            </Text>
            <Switch
              value={accepted}
              onValueChange={setAccepted}
              trackColor={{ true: colors.brandMuted, false: colors.border }}
              thumbColor={accepted ? colors.brand : colors.surfaceMuted}
            />
          </View>
          <Button
            title={loading ? 'Loading…' : 'Complete configuration'}
            loading={saving}
            disabled={loading}
            onPress={completeSetup}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.body, { flex: 1 }]}>Pause synchronization</Text>
            <Switch
              value={!!prefs?.paused}
              onValueChange={togglePause}
              disabled={saving || status === 'unavailable_web'}
              trackColor={{ true: colors.warning, false: colors.border }}
              thumbColor={prefs?.paused ? colors.accent : colors.surfaceMuted}
            />
          </View>
          <Button
            title="Sync now"
            loading={syncing}
            disabled={saving || status === 'unavailable_web'}
            onPress={syncNow}
          />
          <Button
            title="Re-save configuration"
            variant="secondary"
            loading={saving}
            onPress={completeSetup}
          />
          <Button
            title="Turn off call sync"
            variant="ghost"
            disabled={saving}
            onPress={disableSync}
          />
        </View>
      )}

      <Text style={styles.footnote}>
        Automatic sync needs the Realist CRM Android development build (not Expo
        Go). After install, enable sync here and tap Sync now — matched lead
        calls appear under Call History.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.subtitle, color: colors.text },
  status: {
    ...typography.caption,
    color: colors.brand,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  bullet: { ...typography.body, color: colors.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footnote: { ...typography.caption, color: colors.textMuted },
});
