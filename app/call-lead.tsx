import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ignoreLeadPhone, markLeadPhoneKnown } from 'android-call-log';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AuthInput } from '@/features/auth/components/AuthInput';
import {
  callLeadIdempotencyKey,
  parseRingAt,
  pickCallLeadSourceId,
} from '@/features/call-tracking/callLeadLogic';
import {
  checkLeadPhone,
  createLead,
  leadSourcesQuery,
} from '@/features/leads/leadsApi';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';
import { formatPhoneDisplay } from '@/utils/phone';

/**
 * "Yes, add lead" on the incoming-call prompt lands here
 * (salesfast://call-lead?phone=…&at=…). The number is already known, so the
 * user only types the name; the lead is assigned to them.
 */
export default function CallLeadScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ phone?: string; at?: string }>();
  const phone = (Array.isArray(params.phone) ? params.phone[0] : params.phone)?.trim() ?? '';
  const ringAt = parseRingAt(params.at);

  const sources = useQuery(leadSourcesQuery);
  const sourceList = useMemo(
    () => (Array.isArray(sources.data) ? sources.data : []),
    [sources.data]
  );
  const defaultSourceId = useMemo(() => pickCallLeadSourceId(sourceList), [sourceList]);

  const [fullName, setFullName] = useState('');
  const [pickedSourceId, setPickedSourceId] = useState<number | null>(null);
  const sourceId = pickedSourceId ?? defaultSourceId;
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingIds, setExistingIds] = useState<number[]>([]);

  // Someone may have added this number since the call (or the phone's lead
  // list was stale): say so before a duplicate is made.
  useEffect(() => {
    if (!phone) return;
    let cancelled = false;
    checkLeadPhone(phone)
      .then((matches) => {
        if (cancelled || matches.length === 0) return;
        setExistingIds(matches.map((m) => m.id));
        void markLeadPhoneKnown(phone);
      })
      .catch(() => {
        // Advisory only — the server still validates on create.
      });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/(tabs)');
  };

  async function save() {
    setFormError('');
    if (!fullName.trim()) {
      setNameError('Enter the customer name');
      return;
    }
    if (!sourceId) {
      setFormError('Pick a lead source');
      return;
    }
    setSaving(true);
    try {
      const lead = await createLead(
        { fullName: fullName.trim(), phone, leadSourceId: sourceId },
        { idempotencyKey: callLeadIdempotencyKey(phone, ringAt) }
      );
      void markLeadPhoneKnown(phone);
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] });
      if (lead?.id) router.replace(`/leads/${lead.id}`);
      else leave();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create lead'));
      setSaving(false);
    }
  }

  async function notALead() {
    await ignoreLeadPhone(phone);
    leave();
  }

  if (!phone) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="New lead from call" />
        <View style={styles.content}>
          <Text style={styles.body}>This prompt has no phone number. Add the lead from My Leads instead.</Text>
          <Button title="Go to leads" onPress={() => router.replace('/(tabs)/leads')} />
        </View>
      </View>
    );
  }

  const callTime = ringAt
    ? new Date(ringAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New lead from call" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 36 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.callCard}>
          <View style={styles.callIcon}>
            <Ionicons name="call" size={20} color={colors.brand} />
          </View>
          <View style={styles.callText}>
            <Text style={styles.callNumber}>{formatPhoneDisplay(phone)}</Text>
            <Text style={styles.caption}>
              {callTime ? `Incoming call at ${callTime}` : 'Incoming call'}
            </Text>
          </View>
        </View>

        {existingIds.length > 0 ? (
          <View style={styles.existingBanner}>
            <Ionicons name="information-circle" size={18} color={colors.brand} />
            <Text style={styles.existingText}>
              This number is already a lead in SalesFast.
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.replace(`/leads/${existingIds[0]}`)}
            >
              <Text style={styles.link}>Open lead</Text>
            </Pressable>
          </View>
        ) : null}

        {formError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <AuthInput
            label="Customer name *"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              setNameError('');
            }}
            error={nameError}
            placeholder="Who called?"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />

          <Text style={styles.fieldLabel}>Lead source</Text>
          {sources.isPending ? (
            <ActivityIndicator color={colors.brand} style={styles.sourceLoading} />
          ) : sources.isError ? (
            <Pressable onPress={() => void sources.refetch()} hitSlop={8}>
              <Text style={styles.retry}>Could not load sources — tap to retry</Text>
            </Pressable>
          ) : (
            <View style={styles.sourceWrap}>
              {sourceList.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.name}
                  active={sourceId === s.id}
                  onPress={() => {
                    setPickedSourceId(s.id);
                    setFormError('');
                  }}
                />
              ))}
            </View>
          )}
          <Text style={styles.caption}>The lead is assigned to you.</Text>
        </View>

        <Button title="Save lead" loading={saving} onPress={() => void save()} />
        <Button
          title="Not a lead — don't ask again"
          variant="ghost"
          disabled={saving}
          onPress={() => void notALead()}
        />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    body: { ...typography.body, color: colors.textSecondary },
    caption: { ...typography.caption, color: colors.textMuted },
    callCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    callIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    callText: { flex: 1, gap: 2 },
    callNumber: { ...typography.subtitle, color: colors.text },
    existingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.brandSoft,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    existingText: { ...typography.caption, color: colors.text, flex: 1 },
    link: { ...typography.caption, color: colors.brand, fontWeight: '700' },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.dangerSoft,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    errorText: { ...typography.caption, color: colors.danger, flex: 1 },
    form: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    fieldLabel: {
      marginBottom: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    sourceWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    sourceLoading: { alignSelf: 'flex-start', marginBottom: spacing.md },
    retry: { ...typography.caption, color: colors.brand, marginBottom: spacing.md },
  });
}
