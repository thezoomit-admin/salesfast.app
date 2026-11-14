import { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';

import { clearCallCaptureCredentials, clearIgnoredLeadPhones } from 'android-call-log';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/features/auth/AuthContext';
import { syncCallLeadPrompt } from '@/features/call-tracking/CallLeadPromptBootstrap';
import {
  requestCallLeadPermissions,
  useCallLeadPromptStatus,
} from '@/features/call-tracking/callLeadPrompt';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

/** Settings → Leads from calls: the "Is this your lead?" prompt. */
export default function CallLeadSettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const status = useCallLeadPromptStatus();
  const { config, permissions, update, refresh } = status;
  const [saving, setSaving] = useState(false);

  const enabled = !!config?.enabled;
  const skipContacts = config?.skipContacts ?? true;

  const askToOpenSettings = () =>
    Alert.alert(
      'Permission needed',
      'Allow Phone, Call logs and Notifications for SalesFast in system settings, then come back.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => void Linking.openSettings() },
      ]
    );

  const apply = async (nextEnabled: boolean, nextSkipContacts: boolean) => {
    setSaving(true);
    try {
      if (nextEnabled) {
        const granted = await requestCallLeadPermissions(nextSkipContacts);
        if (!granted.required) {
          if (granted.blocked) askToOpenSettings();
          else
            Alert.alert(
              'Not turned on',
              'SalesFast needs Phone, Call logs and Notifications to ask about new callers.'
            );
          await refresh();
          return;
        }
      }
      await update(nextEnabled, nextSkipContacts);
      if (nextEnabled && user) {
        // Token + known lead numbers now, not on the next app open.
        await syncCallLeadPrompt(user.id, { force: true });
        await refresh();
      } else if (!nextEnabled) {
        await clearCallCaptureCredentials();
      }
    } finally {
      setSaving(false);
    }
  };

  const resetIgnored = async () => {
    await clearIgnoredLeadPhones();
    await refresh();
  };

  if (!status.available) {
    return (
      <Screen scroll header={<ScreenHeader title="Leads from calls" />}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Needs the latest Android app</Text>
          <Text style={styles.body}>
            This feature runs on the SalesFast Android app. Install the newest
            version from the download page, then turn it on here.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll header={<ScreenHeader title="Leads from calls" />}>
      <Text style={styles.body}>
        When someone calls and that number is not already a lead in SalesFast,
        you get a clean popup: add them as your lead, or dismiss. Numbers already
        in the CRM skip the popup — call sync attaches them to Call History
        instead. Phone contacts do not matter; only CRM leads are treated as
        known.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.cardTitle}>Ask about new callers</Text>
            <Text style={styles.caption}>
              {enabled
                ? status.needsPermission
                  ? 'On, but a permission was turned off — tap Fix below.'
                  : 'On. Callers not in CRM get the Add as lead popup.'
                : 'Off'}
            </Text>
          </View>
          <Switch
            value={enabled}
            disabled={saving || status.loading}
            onValueChange={(v) => void apply(v, skipContacts)}
            trackColor={{ true: colors.brandMuted, false: colors.border }}
            thumbColor={enabled ? colors.brand : colors.surfaceMuted}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Skip phone contacts</Text>
            <Text style={styles.caption}>
              {skipContacts && !permissions.contacts && enabled
                ? 'Contacts permission is off, so address-book numbers are asked about too.'
                : 'Optional. Ignore numbers saved in your phone book (CRM leads still sync).'}
            </Text>
          </View>
          <Switch
            value={skipContacts}
            disabled={saving || status.loading || !enabled}
            onValueChange={(v) => void apply(enabled, v)}
            trackColor={{ true: colors.brandMuted, false: colors.border }}
            thumbColor={skipContacts ? colors.brand : colors.surfaceMuted}
          />
        </View>

        {status.needsPermission ? (
          <Button
            title="Fix permissions"
            loading={saving}
            onPress={() => void apply(true, skipContacts)}
          />
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What happens on this phone</Text>
        <Text style={styles.bullet}>• Only incoming calls are checked, never outgoing</Text>
        <Text style={styles.bullet}>
          • Already a CRM lead → no popup; Call History sync handles it
          {config?.knownCount ? ` (${config.knownCount} known)` : ''}
        </Text>
        <Text style={styles.bullet}>
          • Not in CRM → professional “Add as lead?” popup (contacts or unknown)
        </Text>
        <Text style={styles.bullet}>
          • Nothing is sent to SalesFast until you save the lead
        </Text>
        <Text style={styles.bullet}>
          • “Not a lead” dismisses it and won’t ask about that number again
        </Text>
      </View>

      {config?.ignoredCount ? (
        <View style={styles.card}>
          <Text style={styles.label}>
            {config.ignoredCount} number{config.ignoredCount === 1 ? '' : 's'} marked
            “Not a lead”
          </Text>
          <Button
            title="Ask about them again"
            variant="secondary"
            onPress={() => void resetIgnored()}
          />
        </View>
      ) : null}

      <Text style={styles.footnote}>
        Some phones (Xiaomi, Oppo, Vivo, Realme) stop apps in the background. If
        prompts don’t appear, allow Autostart and set Battery to “No restrictions”
        for SalesFast.
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
    footnote: { ...typography.caption, color: colors.textMuted },
  });
}
