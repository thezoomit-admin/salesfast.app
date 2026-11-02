import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { authColors } from '@/features/auth/authTheme';
import { useAuth } from '@/features/auth/AuthContext';

const schema = z.object({
  identifier: z.string().min(3, 'Required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const phoneMode = mode === 'phone';
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
    const isEmail = !phoneMode && identifier.includes('@');
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
    <AuthShell
      title="Salesfast"
      subtitle={
        phoneMode
          ? 'Sign in with your phone number'
          : 'Sign in to smarter lead management'
      }
      switchPrompt="Don't have an account?"
      switchAction={
        <Pressable onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.switchLink}>Sign up</Text>
        </Pressable>
      }
    >
      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthInput
            label={phoneMode ? 'Phone number' : 'Email'}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={phoneMode ? 'phone-pad' : 'email-address'}
            textContentType={phoneMode ? 'telephoneNumber' : 'emailAddress'}
            autoComplete={phoneMode ? 'tel' : 'email'}
            prefix={phoneMode ? '+1' : undefined}
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.identifier?.message}
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthInput
            label="Password"
            password
            textContentType="password"
            autoComplete="password"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.password?.message ?? formError ?? undefined}
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        style={styles.forgotPress}
        onPress={() => {}}
      >
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={signingIn}
        onPress={() => void onSubmit()}
        style={[styles.button, signingIn ? styles.buttonDisabled : null]}
      >
        {signingIn ? (
          <ActivityIndicator color={authColors.white} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  switchLink: {
    color: authColors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  forgotPress: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 10,
    paddingVertical: 4,
  },
  forgotText: {
    color: authColors.primary,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: authColors.primary,
    borderRadius: authColors.radius,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: authColors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
