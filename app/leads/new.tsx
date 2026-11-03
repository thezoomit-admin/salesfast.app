import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { FilterChip } from '@/components/ui/FilterChip';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AuthInput } from '@/features/auth/components/AuthInput';
import {
  checkLeadPhone,
  createLead,
  leadSourcesQuery,
} from '@/features/leads/leadsApi';
import { radii, spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

type Errors = Partial<Record<'fullName' | 'phone' | 'source', string>>;

/** Add lead from My Leads — Hisab add-transaction pattern (FAB → form). */
export default function NewLeadScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sources = useQuery(leadSourcesQuery);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  // One key per form, so a retried save never creates the lead twice.
  const [idempotencyKey] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  );

  const canSave =
    Boolean(fullName.trim() && phone.trim() && sourceId) && !saving;

  function validate(): Errors {
    const next: Errors = {};
    if (!fullName.trim()) next.fullName = 'Full name is required';
    if (phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid phone';
    if (!sourceId) next.source = 'Pick a lead source';
    return next;
  }

  async function save() {
    setSaving(true);
    try {
      const lead = await createLead(
        {
          fullName: fullName.trim(),
          phone: phone.trim(),
          leadSourceId: sourceId!,
          email: email.trim() || null,
          inquiryNote: note.trim() || null,
        },
        { idempotencyKey }
      );
      void queryClient.invalidateQueries({ queryKey: ['my-leads'] });
      void queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] });
      if (lead?.id) router.replace(`/leads/${lead.id}`);
      else router.back();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create lead'));
      setSaving(false);
    }
  }

  async function onSave() {
    setFormError('');
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    let matches: { id: number }[] = [];
    try {
      matches = await checkLeadPhone(phone.trim());
    } catch {
      // Duplicate check is advisory — the server still validates on create.
    }
    if (matches.length === 0) {
      await save();
      return;
    }
    setSaving(false);
    Alert.alert(
      'Phone already exists',
      `${matches.length} lead${matches.length > 1 ? 's' : ''} already use${
        matches.length > 1 ? '' : 's'
      } this phone. Create another one?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create anyway', onPress: () => void save() },
      ]
    );
  }

  const sourceList = Array.isArray(sources.data) ? sources.data : [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="New lead"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save lead"
            disabled={!canSave}
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.savePill,
              !canSave && styles.savePillDisabled,
              pressed && canSave && styles.pressedOpacity,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.savePillText}>Save</Text>
            )}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 36 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <AuthInput
            label="Full name *"
            value={fullName}
            onChangeText={(v) => {
              setFullName(v);
              setErrors((e) => ({ ...e, fullName: undefined }));
            }}
            error={errors.fullName}
            placeholder="Customer name"
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={100}
            returnKeyType="next"
          />
          <AuthInput
            label="Phone *"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            error={errors.phone}
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            returnKeyType="next"
          />
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Optional"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={120}
          />

          <Text style={styles.fieldLabel}>Lead source *</Text>
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
                    setSourceId(s.id);
                    setErrors((e) => ({ ...e, source: undefined }));
                  }}
                />
              ))}
            </View>
          )}
          {errors.source ? (
            <Text style={styles.fieldError}>{errors.source}</Text>
          ) : null}

          <AuthInput
            label="Note"
            value={note}
            onChangeText={setNote}
            placeholder="What is the customer looking for?"
            multiline
            textAlignVertical="top"
            containerStyle={styles.noteWrap}
            style={styles.noteInput}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    pressedOpacity: { opacity: 0.88 },
    savePill: {
      minWidth: 64,
      height: 34,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    savePillDisabled: {
      backgroundColor: colors.border,
    },
    savePillText: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.white,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.dangerSoft,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      flex: 1,
    },
    form: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: spacing.lg,
      paddingBottom: spacing.sm,
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
      marginBottom: 18,
    },
    sourceLoading: {
      alignSelf: 'flex-start',
      marginBottom: 18,
    },
    retry: {
      ...typography.caption,
      color: colors.brand,
      marginBottom: 18,
    },
    fieldError: {
      marginTop: -12,
      marginBottom: 18,
      fontSize: 12,
      color: colors.danger,
    },
    noteWrap: {
      marginBottom: 18,
    },
    noteInput: {
      minHeight: 96,
    },
  });
}
