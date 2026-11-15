import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  clearCallCaptureCredentials,
  clearWhatsAppCalls,
  getCallLeadPromptConfig,
  getWhatsAppDiagnostics,
  openNotificationAccessSettings,
} from 'android-call-log';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/features/auth/AuthContext';
import { syncCallLeadPrompt } from '@/features/call-tracking/CallLeadPromptBootstrap';
import { useCallSyncStatus } from '@/features/call-tracking/useCallSyncStatus';
import {
  requestContactsPermission,
  requestNotificationPermission,
  useWhatsAppCallStatus,
} from '@/features/call-tracking/whatsAppCalls';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

/**
 * Settings → WhatsApp calls. Everything here is for this phone only: the
 * same account on another phone keeps its own switches.
 */
export default function WhatsAppCallSettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const status = useWhatsAppCallStatus();
  const callSync = useCallSyncStatus();
  const { config, update, refresh } = status;
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);

  const syncOn = !!config?.syncEnabled;
  const promptOn = !!config?.promptEnabled;
  const accessGranted = !!config?.accessGranted;
  const callSyncReady = callSync.status === 'configured';

  const openAccess = async () => {
    const opened = await openNotificationAccessSettings();
    if (!opened) void Linking.openSettings();
  };

  const askForAccess = () =>
    Alert.alert(
      'One more step',
      'Allow Notification access for SalesFast. That is how the phone sees WhatsApp calls (WhatsApp keeps them out of the normal call log).\n\nIf the switch is greyed out: App info → ⋮ (top right) → Allow restricted settings, then try again.',
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Open settings', onPress: () => void openAccess() },
      ]
    );

  const apply = async (patch: { syncEnabled?: boolean; promptEnabled?: boolean }) => {
    setSaving(true);
    try {
      const turningOn = patch.syncEnabled === true || patch.promptEnabled === true;
      if (patch.promptEnabled) {
        const notifications = await requestNotificationPermission();
        if (!notifications) {
          Alert.alert(
            'Not turned on',
            'SalesFast needs Notifications to ask about new WhatsApp callers.'
          );
          return;
        }
      }
      // Optional: without it, callers saved by name can't be matched.
      if (turningOn && !status.contactsGranted) await requestContactsPermission();

      await update(patch);

      if (patch.promptEnabled && user) {
        // Token + known lead numbers now, not on the next app open.
        await syncCallLeadPrompt(user.id, { force: true });
      }
      if (patch.promptEnabled === false) {
        const phonePrompt = await getCallLeadPromptConfig();
        if (!phonePrompt?.enabled) await clearCallCaptureCredentials();
      }
      if (turningOn && !accessGranted) askForAccess();
    } finally {
      setSaving(false);
      await refresh();
    }
  };

  const toggleApp = async (patch: { trackWhatsApp?: boolean; trackBusiness?: boolean }) => {
    setSaving(true);
    try {
      await update(patch);
    } finally {
      setSaving(false);
    }
  };

  const showLog = async () => setLog(await getWhatsAppDiagnostics());

  const clearLog = async () => {
    await clearWhatsAppCalls();
    setLog([]);
    await refresh();
  };

  if (!status.available) {
    return (
      <Screen scroll header={<ScreenHeader title="WhatsApp calls" />}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Needs the latest Android app</Text>
          <Text style={styles.body}>
            WhatsApp call tracking runs on the SalesFast Android app. Install the newest
            version from the download page, then turn it on here.
          </Text>
        </View>
      </Screen>
    );
  }

  const switchProps = (value: boolean) => ({
    trackColor: { true: colors.brandMuted, false: colors.border },
    thumbColor: value ? colors.brand : colors.surfaceMuted,
  });

  return (
    <Screen scroll header={<ScreenHeader title="WhatsApp calls" />}>
      <Text style={styles.body}>
        Track WhatsApp calls on this phone, the same way as normal calls: calls with
        CRM leads go to their Call History with the duration, and new callers can be
        added as leads. Only this phone is affected.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Sync WhatsApp calls</Text>
            <Text style={styles.caption}>
              {syncOn
                ? callSyncReady
                  ? 'On. Calls with CRM leads appear in Call History.'
                  : 'On, but Call sync is off — turn it on below.'
                : 'Off'}
            </Text>
          </View>
          <Switch
            value={syncOn}
            disabled={saving || status.loading}
            onValueChange={(v) => void apply({ syncEnabled: v })}
            {...switchProps(syncOn)}
          />
        </View>

        {syncOn && !callSyncReady ? (
          <Button
            title="Turn on Call sync"
            variant="secondary"
            onPress={() => router.push('/call-sync/setup')}
          />
        ) : null}

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Ask about new WhatsApp callers</Text>
            <Text style={styles.caption}>
              {promptOn
                ? 'On. After a WhatsApp call from a number not in CRM: “Add as lead?”'
                : 'Off'}
            </Text>
          </View>
          <Switch
            value={promptOn}
            disabled={saving || status.loading}
            onValueChange={(v) => void apply({ promptEnabled: v })}
            {...switchProps(promptOn)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification access</Text>
        <Text style={styles.caption}>
          {accessGranted
            ? 'Allowed. SalesFast can see WhatsApp calls.'
            : 'Not allowed yet. Needed for both switches above.'}
        </Text>
        {!accessGranted ? (
          <>
            <Button title="Allow notification access" onPress={() => void openAccess()} />
            <Text style={styles.caption}>
              Switch greyed out (Android 13+)? Open App info → ⋮ (top right) → Allow
              restricted settings, then come back and try again.
            </Text>
            <Button
              title="Open App info"
              variant="secondary"
              onPress={() => void Linking.openSettings()}
            />
          </>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.label}>Contacts</Text>
        <Text style={styles.caption}>
          {status.contactsGranted
            ? 'Allowed. Saved callers (shown by name in WhatsApp) are matched by their number.'
            : 'Recommended. WhatsApp shows saved callers by name only; without Contacts their calls can’t be matched.'}
        </Text>
        {!status.contactsGranted ? (
          <Button
            title="Allow contacts"
            variant="secondary"
            onPress={async () => {
              const granted = await requestContactsPermission();
              if (!granted) void Linking.openSettings();
              await refresh();
            }}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Apps to track</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>WhatsApp</Text>
            <Text style={styles.caption}>
              {config?.whatsAppInstalled ? 'Installed' : 'Not installed on this phone'}
            </Text>
          </View>
          <Switch
            value={!!config?.trackWhatsApp}
            disabled={saving || status.loading}
            onValueChange={(v) => void toggleApp({ trackWhatsApp: v })}
            {...switchProps(!!config?.trackWhatsApp)}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>WhatsApp Business</Text>
            <Text style={styles.caption}>
              {config?.businessInstalled ? 'Installed' : 'Not installed on this phone'}
            </Text>
          </View>
          <Switch
            value={!!config?.trackBusiness}
            disabled={saving || status.loading}
            onValueChange={(v) => void toggleApp({ trackBusiness: v })}
            {...switchProps(!!config?.trackBusiness)}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How it works</Text>
        <Text style={styles.bullet}>
          • Reads only WhatsApp call notifications — never your messages
        </Text>
        <Text style={styles.bullet}>
          • Only calls with CRM lead numbers are sent to SalesFast
        </Text>
        <Text style={styles.bullet}>
          • The “Add as lead?” popup comes after the call, never over WhatsApp’s Answer button
        </Text>
        <Text style={styles.bullet}>
          • Call length is measured from WhatsApp’s call timer (a few seconds either way)
        </Text>
        <Text style={styles.bullet}>• Group calls are skipped</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>On this phone</Text>
        <Text style={styles.caption}>
          {config?.lastEventAtMs
            ? `Last WhatsApp call seen ${new Date(config.lastEventAtMs).toLocaleString()}`
            : 'No WhatsApp call seen yet. Make a test call to check.'}
        </Text>
        <Text style={styles.caption}>
          {`${config?.callCount ?? 0} call${config?.callCount === 1 ? '' : 's'} kept on the phone (30 days)`}
          {config?.unresolvedCount
            ? ` · ${config.unresolvedCount} without a number (name not in contacts or group call)`
            : ''}
        </Text>
        {log == null ? (
          <Pressable onPress={() => void showLog()} hitSlop={8}>
            <Text style={styles.link}>Show detection log</Text>
          </Pressable>
        ) : (
          <View style={styles.logBox}>
            <Text style={styles.logText} selectable>
              {log.length
                ? log.join('\n')
                : 'Empty. Make or receive a WhatsApp call, then open this again.'}
            </Text>
            <Button title="Clear calls and log" variant="secondary" onPress={() => void clearLog()} />
          </View>
        )}
      </View>

      <Text style={styles.footnote}>
        Some phones (Xiaomi, Oppo, Vivo, Realme) stop apps in the background. If calls
        don’t show up, allow Autostart and set Battery to “No restrictions” for SalesFast.
        Android only — iPhone does not allow this.
      </Text>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { ...typography.body, color: colors.textSecondary },
    caption: { ...typography.caption, color: colors.textMuted },
    label: { ...typography.body, color: colors.text, fontWeight: '600' },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardTitle: { ...typography.subtitle, color: colors.text },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { flex: 1, gap: 2 },
    bullet: { ...typography.body, color: colors.textSecondary },
    divider: { height: 1, backgroundColor: colors.border },
    link: { ...typography.body, color: colors.brand, fontWeight: '600' },
    logBox: { gap: spacing.sm },
    logText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontFamily: 'monospace',
    },
    footnote: { ...typography.caption, color: colors.textMuted },
  });
}
