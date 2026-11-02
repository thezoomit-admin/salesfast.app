import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import { forgotPasswordRequest } from '@/features/auth/authApi';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { useTheme, type ThemeColors } from '@/theme';

type FormValues = { identifier: string };

const resolver = formResolver<FormValues>((v) => ({
  identifier: minLength(v.identifier, 3, 'Email or phone is required'),
}));

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: { identifier: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSubmitting(true);
    try {
      const identifier = values.identifier.trim();
      await forgotPasswordRequest(identifier);
      router.push({
        pathname: '/(auth)/reset-password',
        params: { identifier },
      });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to send reset code'));
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
          <Text style={styles.headerTitle}>Forgot password</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter the email or phone your admin shared — we&apos;ll send a 6-digit
          code.
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
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.identifier?.message ?? formError ?? undefined}
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
            <Text style={styles.primaryBtnText}>Send reset code</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backLinkWrap}
          hitSlop={6}
        >
          <Text style={styles.backLink}>Back to login</Text>
        </Pressable>
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
    backLinkWrap: {
      marginTop: 22,
      alignItems: 'center',
    },
    backLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand,
    },
  });
}
