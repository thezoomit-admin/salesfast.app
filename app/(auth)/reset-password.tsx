import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formResolver, minLength } from '@/lib/formResolver';

import { getErrorMessage } from '@/api/client';
import { resetPasswordRequest } from '@/features/auth/authApi';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { useTheme, type ThemeColors } from '@/theme';

type FormValues = {
  identifier: string;
  otp: string;
  password: string;
  confirmPassword: string;
};

const resolver = formResolver<FormValues>(
  (v) => ({
    identifier: minLength(v.identifier, 3, 'Email or phone is required'),
    otp: !/^\d{6}$/.test(v.otp ?? '') && 'Code must be 6 digits',
    password: minLength(v.password, 6, 'At least 6 characters'),
    confirmPassword: minLength(v.confirmPassword, 1, 'Confirm the new password'),
  }),
  // Only once every field is valid (as zod's refine did).
  (v) => ({
    confirmPassword: v.password !== v.confirmPassword && 'Passwords do not match',
  })
);

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { identifier: preset } = useLocalSearchParams<{
    identifier?: string;
  }>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      identifier: typeof preset === 'string' ? preset : '',
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      await resetPasswordRequest({
        identifier: values.identifier.trim(),
        otp: values.otp.trim(),
        password: values.password,
      });
      Alert.alert('Password updated', 'Sign in with your new password.', [
        {
          text: 'Login',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to reset password'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Reset password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          Use the 6-digit code from your email or SMS, then choose a new
          password.
        </Text>

        <Controller
          control={control}
          name="identifier"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="Email or phone"
              placeholder="you@company.com"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.identifier?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="otp"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="Verification code"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.otp?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="New password"
              placeholder="At least 6 characters"
              password
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="Confirm password"
              placeholder="Re-enter new password"
              password
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={
                errors.confirmPassword?.message ?? formError ?? undefined
              }
              returnKeyType="done"
              onSubmitEditing={() => void onSubmit()}
            />
          )}
        />

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed ? styles.primaryBtnPressed : null,
            submitting ? styles.primaryBtnDisabled : null,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>Reset password</Text>
          )}
        </Pressable>

        <View style={styles.footerLinks}>
          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={6}
          >
            <Text style={styles.link}>Resend code</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={6}
          >
            <Text style={styles.link}>Back to login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? colors.background : colors.white,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 44,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surface : colors.white,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 28,
    },
    primaryBtn: {
      minHeight: 54,
      borderRadius: 10,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    primaryBtnPressed: {
      backgroundColor: colors.brandMuted,
    },
    primaryBtnDisabled: {
      opacity: 0.7,
    },
    primaryBtnText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
    footerLinks: {
      marginTop: 22,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    link: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand,
    },
    dot: {
      color: colors.border,
    },
  });
}
