import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
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
import { formResolver, minLength } from '@/lib/formResolver';

import { getErrorMessage } from '@/api/client';
import { AuthInput } from '@/features/auth/components/AuthInput';
import { CountryPhoneInput } from '@/features/auth/components/CountryPhoneInput';
import { promptContactAdmin } from '@/features/auth/contactAdmin';
import {
  DEFAULT_COUNTRY_CODE,
  findCountry,
  toE164,
} from '@/features/auth/data/countries';
import { useAuth } from '@/features/auth/AuthContext';
import type { SavedMobileAccount } from '@/features/auth/savedAccounts';
import { secureStorage } from '@/services/secureStorage';
import { useTheme, type ThemeColors } from '@/theme';

type FormValues = { identifier: string; password: string };

const resolver = formResolver<FormValues>((v) => ({
  identifier: minLength(v.identifier, 3, 'Required'),
  password: minLength(v.password, 1, 'Password is required'),
}));

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const phoneMode = mode === 'phone';
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { signIn, signingIn, switchToAccount, switchingAccount, getSavedAccounts } =
    useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [countryCode, setCountryCode] = useState<CountryCode>(
    DEFAULT_COUNTRY_CODE
  );
  const [refreshing, setRefreshing] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedMobileAccount[]>([]);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues: { identifier: '', password: '' },
  });

  const phoneNational = watch('identifier');

  const loadAccounts = useCallback(async () => {
    const list = await getSavedAccounts();
    setSavedAccounts(list.filter((a) => !a.signedOut && a.accessToken));
  }, [getSavedAccounts]);

  useFocusEffect(
    useCallback(() => {
      void loadAccounts();
    }, [loadAccounts])
  );

  useEffect(() => {
    if (phoneMode) return;
    void (async () => {
      const remembered = await secureStorage.getRememberEmail();
      if (remembered) {
        setRemember(true);
        setValue('identifier', remembered);
      }
    })();
  }, [phoneMode, setValue]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setFormError(null);
    setSwitchError(null);
    setRemember(true);
    setCountryCode(DEFAULT_COUNTRY_CODE);
    reset({ identifier: '', password: '' });
    clearErrors();
    void loadAccounts().finally(() => {
      setTimeout(() => setRefreshing(false), 350);
    });
  }, [clearErrors, loadAccounts, reset]);

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
        await secureStorage.setRememberEmail(
          remember && isEmail ? identifier : null
        );
      }
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to sign in'));
    }
  });

  const onContinueAs = async (accountId: string) => {
    setSwitchError(null);
    try {
      await switchToAccount(accountId);
    } catch (error) {
      setSwitchError(getErrorMessage(error, 'Unable to switch account'));
    }
  };

  const busy = signingIn || switchingAccount;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
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
          <Text style={styles.headerTitle}>Login</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.greeting}>Hi, Welcome Back! 👋</Text>
        <Text style={styles.subGreeting}>
          Use the credentials your admin shared with you.
        </Text>

        {savedAccounts.length > 0 ? (
          <View style={styles.savedBlock}>
            <Text style={styles.savedLabel}>Continue as</Text>
            {savedAccounts.map((account) => (
              <Pressable
                key={account.id}
                disabled={busy}
                onPress={() => void onContinueAs(account.id)}
                style={({ pressed }) => [
                  styles.savedRow,
                  pressed ? styles.savedRowPressed : null,
                ]}
              >
                <View style={styles.savedAvatar}>
                  <Text style={styles.savedAvatarText}>
                    {(account.name || account.email || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.savedMeta}>
                  <Text style={styles.savedName} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={styles.savedEmail} numberOfLines={1}>
                    {account.email}
                  </Text>
                </View>
                {switchingAccount ? (
                  <ActivityIndicator color={colors.brand} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </Pressable>
            ))}
            {switchError ? (
              <Text style={styles.switchError}>{switchError}</Text>
            ) : null}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or sign in</Text>
              <View style={styles.orLine} />
            </View>
          </View>
        ) : null}

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
                <Ionicons name="checkmark" size={12} color={colors.white} />
              ) : null}
            </View>
            <Text style={styles.rememberLabel}>Remember Me</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            hitSlop={6}
          >
            <Text style={styles.forgot}>Forget Password</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onSubmit()}
          style={({ pressed }) => [
            styles.loginBtn,
            pressed ? styles.loginBtnPressed : null,
            busy ? styles.loginBtnDisabled : null,
          ]}
        >
          {signingIn ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.loginBtnText}>Login</Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>Need an account? </Text>
          <Pressable onPress={() => promptContactAdmin()} hitSlop={6}>
            <Text style={styles.registerLink}>Contact Us</Text>
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
    greeting: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    subGreeting: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      marginBottom: 28,
    },
    savedBlock: {
      marginBottom: 8,
    },
    savedLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 10,
    },
    savedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 10,
      backgroundColor: isDark ? colors.surface : '#F7F7F8',
    },
    savedRowPressed: {
      backgroundColor: isDark ? colors.surfaceMuted : '#EEEEF0',
    },
    savedAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    savedAvatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.brand,
    },
    savedMeta: {
      flex: 1,
    },
    savedName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    savedEmail: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    switchError: {
      color: colors.danger,
      fontSize: 13,
      marginBottom: 8,
    },
    orRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
      marginBottom: 18,
    },
    orLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    orText: {
      fontSize: 13,
      color: colors.textMuted,
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
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surface : colors.white,
    },
    checkboxOn: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    rememberLabel: {
      fontSize: 13,
      color: colors.text,
      fontWeight: '500',
    },
    forgot: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.brand,
    },
    loginBtn: {
      minHeight: 54,
      borderRadius: 10,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loginBtnPressed: {
      backgroundColor: colors.brandMuted,
    },
    loginBtnDisabled: {
      opacity: 0.7,
    },
    loginBtnText: {
      color: colors.white,
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
      color: colors.textMuted,
    },
    registerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.brand,
    },
  });
}
