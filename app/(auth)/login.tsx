import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CountryCode } from 'libphonenumber-js';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { CountryPhoneInput } from '@/features/auth/components/CountryPhoneInput';
import { authColors } from '@/features/auth/authTheme';
import {
  DEFAULT_COUNTRY_CODE,
  findCountry,
  toE164,
} from '@/features/auth/data/countries';
import { useAuth } from '@/features/auth/AuthContext';

const schema = z.object({
  identifier: z.string().min(3, 'Required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

function socialSoon(name: string) {
  Alert.alert('Upcoming', `${name} sign-in will be available soon.`, [
    { text: 'OK' },
  ]);
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const phoneMode = mode === 'phone';
  const { signIn, signingIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [countryCode, setCountryCode] = useState<CountryCode>(
    DEFAULT_COUNTRY_CODE
  );

  const [refreshing, setRefreshing] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  const phoneNational = watch('identifier');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setFormError(null);
    setRemember(true);
    setCountryCode(DEFAULT_COUNTRY_CODE);
    reset({ identifier: '', password: '' });
    clearErrors();
    // Brief spinner so pull-to-refresh feels responsive
    setTimeout(() => setRefreshing(false), 450);
  }, [clearErrors, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (phoneMode) {
        const country = findCountry(countryCode);
        const phone = toE164(country.dialCode, values.identifier);
        if (phone.replace(/\D/g, '').length < 8) {
          setFormError('Enter a valid phone number');
          return;
        }
        await signIn({ password: values.password, phone });
      } else {
        const identifier = values.identifier.trim();
        const isEmail = identifier.includes('@');
        await signIn({
          password: values.password,
          ...(isEmail ? { email: identifier } : { phone: identifier }),
        });
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in'));
    }
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={authColors.primary}
            colors={[authColors.primary]}
          />
        }
      >
        {/* Header: back + Login */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={authColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Login</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.greeting}>Hi, Welcome Back! 👋</Text>
        <Text style={styles.subGreeting}>
          Happy to see you again, please login here.
        </Text>

        {phoneMode ? (
          <CountryPhoneInput
            label="Phone Number"
            value={phoneNational}
            countryCode={countryCode}
            onChangeCountry={setCountryCode}
            onChangeNational={(national) =>
              setValue('identifier', national, { shouldValidate: true })
            }
            error={errors.identifier?.message}
          />
        ) : (
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, onBlur, value } }) => (
              <AuthInput
                label="Email Address"
                placeholder="Enter your email address"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.identifier?.message}
                returnKeyType="next"
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthInput
              label="Password"
              placeholder="Enter your password"
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

        <View style={styles.rowBetween}>
          <Pressable
            style={styles.rememberRow}
            onPress={() => setRemember((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
          >
            <View style={[styles.checkbox, remember ? styles.checkboxOn : null]}>
              {remember ? (
                <Ionicons name="checkmark" size={12} color={authColors.white} />
              ) : null}
            </View>
            <Text style={styles.rememberLabel}>Remember Me</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              Alert.alert('Upcoming', 'Forgot password will be available soon.', [
                { text: 'OK' },
              ])
            }
            hitSlop={6}
          >
            <Text style={styles.forgot}>Forget Password</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={signingIn}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            styles.loginBtn,
            pressed ? styles.loginBtnPressed : null,
            signingIn ? styles.loginBtnDisabled : null,
          ]}
        >
          {signingIn ? (
            <ActivityIndicator color={authColors.white} />
          ) : (
            <Text style={styles.loginBtnText}>Login</Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Don&apos;t have an account? </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Contact administration',
                'To create a Salesfast account, please contact your administrator. Accounts are provisioned by your organization.',
                [{ text: 'OK' }]
              )
            }
            hitSlop={6}
          >
            <Text style={styles.registerLink}>Register</Text>
          </Pressable>
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>Or Login with</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login with Twitter"
            style={styles.socialCircle}
            onPress={() => socialSoon('Twitter')}
          >
            <FontAwesome name="twitter" size={20} color="#1DA1F2" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login with Google"
            style={styles.socialCircle}
            onPress={() => socialSoon('Google')}
          >
            <FontAwesome name="google" size={20} color="#EA4335" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login with Facebook"
            style={styles.socialCircle}
            onPress={() => socialSoon('Facebook')}
          >
            <FontAwesome name="facebook" size={20} color="#1877F2" />
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.white,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.white,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: authColors.text,
  },
  headerSpacer: {
    width: 40,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: authColors.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 14,
    lineHeight: 20,
    color: authColors.muted,
    marginBottom: 28,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    marginTop: -4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: authColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.white,
  },
  checkboxOn: {
    backgroundColor: authColors.primary,
    borderColor: authColors.primary,
  },
  rememberLabel: {
    fontSize: 13,
    color: authColors.text,
    fontWeight: '500',
  },
  forgot: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E8A317',
  },
  loginBtn: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnPressed: {
    backgroundColor: authColors.primaryPressed,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: authColors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  registerPrompt: {
    fontSize: 14,
    color: authColors.muted,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: authColors.primary,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    marginBottom: 18,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: authColors.border,
  },
  orText: {
    fontSize: 13,
    color: authColors.muted,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: authColors.border,
    backgroundColor: authColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
