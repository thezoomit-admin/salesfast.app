import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useAuth } from '@/features/auth/AuthContext';
import { updateProfileRequest } from '@/features/auth/authApi';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { colors, radii, spacing, typography } from '@/theme';

/**
 * Personal info — Hisab settings/edit pattern.
 * Editable: name, phone. Read-only: email, designation/role.
 */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name?.trim() ?? '');
  const [phone, setPhone] = useState(user?.phone?.trim() ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (saving) return;
    setName(user?.name?.trim() ?? '');
    setPhone(user?.phone?.trim() ?? '');
  }, [user?.name, user?.phone, saving]);

  const dirty =
    name.trim() !== (user?.name?.trim() ?? '') ||
    (phone.trim() || '') !== (user?.phone?.trim() ?? '');

  const canSave = dirty && Boolean(name.trim()) && !saving;

  const designation =
    user?.designation?.name?.trim() || user?.role?.trim() || 'Agent';

  const completeness = useMemo(() => {
    const checks = [
      Boolean(user?.name?.trim() || name.trim()),
      Boolean(user?.email?.trim()),
      Boolean(phone.trim() || user?.phone?.trim()),
      Boolean(user?.profilePhoto?.trim()),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [user, name, phone]);

  async function onSave() {
    setError('');
    const nextName = name.trim();
    if (!nextName) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const nextPhone = phone.trim() || null;
      const updated = await updateProfileRequest({
        name: nextName,
        phone: nextPhone,
      });
      // Keep designation / photo if API omits them.
      await updateUser({
        ...user!,
        ...updated,
        designation: updated.designation ?? user?.designation ?? null,
        designationId: updated.designationId ?? user?.designationId ?? null,
        profilePhoto: updated.profilePhoto ?? user?.profilePhoto ?? null,
      });
      Alert.alert('Saved', 'Personal info updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Personal info"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save"
            disabled={!canSave}
            onPress={() => void onSave()}
            style={({ pressed }) => [
              styles.savePill,
              !canSave && styles.savePillDisabled,
              pressed && canSave && styles.pressed,
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
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <UserAvatar
              uri={user?.profilePhoto}
              name={name.trim() || user?.name}
              size={96}
              muted
            />
          </View>
          <Text style={styles.heroName} numberOfLines={1}>
            {name.trim() || user?.name?.trim() || 'Your name'}
          </Text>
          {user?.email ? (
            <Text style={styles.heroMeta} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
          <Text style={styles.heroRole} numberOfLines={1}>
            {designation}
          </Text>
        </View>

        <View style={styles.completeCard}>
          <View style={styles.completeHeader}>
            <Text style={styles.completeLabel}>Profile completeness</Text>
            <Text style={styles.completePct}>{completeness}%</Text>
          </View>
          <View style={styles.completeTrack}>
            <View
              style={[styles.completeFill, { width: `${completeness}%` }]}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <AuthInput
            label="Full name"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setError('');
            }}
            placeholder="Your name"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />
          <AuthInput
            label="Phone"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError('');
            }}
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            returnKeyType="done"
          />
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyLabel}>Email</Text>
            <Text style={styles.readOnlyValue} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            <Text style={styles.readOnlyHint}>
              Contact admin to change email
            </Text>
          </View>
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyLabel}>Designation</Text>
            <Text style={styles.readOnlyValue} numberOfLines={1}>
              {designation}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  pressed: { opacity: 0.9 },
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
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: 6,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#EEF2F7',
    marginBottom: spacing.sm,
  },
  heroName: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  heroRole: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  completeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  completeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  completePct: {
    ...typography.subtitle,
    fontSize: 14,
    color: colors.text,
  },
  completeTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  completeFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
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
  readOnly: {
    marginBottom: 18,
  },
  readOnlyLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  readOnlyValue: {
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textSecondary,
  },
  readOnlyHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 6,
  },
});
