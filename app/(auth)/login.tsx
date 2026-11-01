import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { API_BASE_URL, APP_NAME } from '@/constants/config';
import { useAuth } from '@/features/auth/AuthContext';
import { colors, radii, spacing, typography } from '@/theme';

const schema = z.object({
  identifier: z.string().min(3, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn, signingIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const identifier = values.identifier.trim();
    const isEmail = identifier.includes('@');
    try {
      await signIn({
        password: values.password,
        ...(isEmail ? { email: identifier } : { phone: identifier }),
      });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in'));
    }
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.tagline}>
            Sign in with your CRM account to manage leads on the go.
          </Text>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email or phone"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.identifier?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />
          {formError ? <Text style={styles.error}>{formError}</Text> : null}
          <Text style={styles.apiHint}>API: {API_BASE_URL}</Text>
          <Button title="Sign in" onPress={onSubmit} loading={signingIn} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'center', gap: spacing.xl },
  hero: { gap: spacing.sm },
  brand: { ...typography.display, color: colors.brand },
  tagline: { ...typography.body, color: colors.textSecondary, maxWidth: 320 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { ...typography.caption, color: colors.danger },
  apiHint: { ...typography.caption, color: colors.textMuted },
});
