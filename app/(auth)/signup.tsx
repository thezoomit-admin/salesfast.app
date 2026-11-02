import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';

import { AuthInput } from '@/features/auth/components/AuthInput';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { authColors } from '@/features/auth/authTheme';

const schema = z
  .object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    phone: z.string().min(7, 'Enter a valid phone'),
    password: z.string().min(6, 'Min 6 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async () => {
    setSubmitting(true);
    try {
      Alert.alert(
        'Account setup',
        'Salesfast accounts are created by your admin. Please sign in with the credentials they provided.',
        [{ text: 'Sign in', onPress: () => router.replace('/(auth)/login') }]
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthShell
      title="Salesfast"
      subtitle="Create your Salesfast account"
      switchPrompt="Already have an account?"
      switchAction={
        <Pressable onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.switchLink}>Sign in</Text>
        </Pressable>
      }
    >
      <View style={styles.row}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="First name"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.firstName?.message}
              containerStyle={styles.half}
            />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="Last name"
              autoCapitalize="words"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              error={errors.lastName?.message}
              containerStyle={styles.half}
            />
          )}
        />
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthInput
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <AuthInput
            label="Phone number"
            keyboardType="phone-pad"
            prefix="+1"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.phone?.message}
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
            password
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.confirmPassword?.message}
          />
        )}
      />

      <Pressable
        accessibilityRole="button"
        disabled={submitting}
        onPress={() => void onSubmit()}
        style={[styles.button, submitting ? styles.buttonDisabled : null]}
      >
        {submitting ? (
          <ActivityIndicator color={authColors.white} />
        ) : (
          <Text style={styles.buttonText}>Sign up</Text>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
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
