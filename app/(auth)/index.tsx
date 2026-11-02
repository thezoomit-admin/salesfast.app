import { Mail01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProviderButton } from '@/features/auth/components/AuthProviderButton';
import { BrandMark } from '@/features/auth/components/BrandMark';
import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { authColors } from '@/features/auth/authTheme';
import { useAuth } from '@/features/auth/AuthContext';

/** Resets on hard reload / cold start so splash plays once per session. */
let splashPlayedThisSession = false;

export default function WelcomeScreen() {
  const { bootstrapping } = useAuth();
  const [showSplash, setShowSplash] = useState(!splashPlayedThisSession);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onSplashFinished = useCallback(() => {
    splashPlayedThisSession = true;
    setShowSplash(false);
  }, []);

  if (bootstrapping) {
    return <BrandSplash mode="blank" />;
  }

  if (showSplash) {
    return (
      <BrandSplash
        mode="animated"
        onFinished={onSplashFinished}
        holdMs={650}
      />
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <View style={styles.logoHalo}>
            <BrandMark variant="icon" size={76} />
          </View>
          <Text style={styles.welcomeTo}>Welcome to</Text>
          <Text style={styles.name}>Salesfast</Text>
          <Text style={styles.tagline}>
            Manage leads, calls, and follow-ups — all in one place.
          </Text>
        </View>

        <View style={styles.actions}>
          <AuthProviderButton
            label="Continue with Email"
            icon={
              <HugeiconsIcon
                icon={Mail01Icon}
                size={18}
                color={authColors.text}
                strokeWidth={2}
              />
            }
            onPress={() => router.push('/(auth)/login')}
          />
          <AuthProviderButton
            label="Continue with Phone"
            icon={
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                size={18}
                color={authColors.text}
                strokeWidth={2}
              />
            }
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { mode: 'phone' },
              })
            }
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Upcoming', 'Forgot password will be available soon.', [
              { text: 'OK' },
            ])
          }
          style={styles.forgotPress}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <View style={styles.signInRow}>
          <Text style={styles.signInPrompt}>Have an account? </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            hitSlop={6}
          >
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.white,
    paddingHorizontal: 28,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  logoHalo: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 70, 28, 0.06)',
    marginBottom: 4,
  },
  welcomeTo: {
    marginTop: 16,
    color: authColors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  name: {
    marginTop: 4,
    color: authColors.text,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 10,
    color: authColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  actions: {
    width: '100%',
    alignSelf: 'stretch',
  },
  footer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
  },
  forgotPress: {
    paddingVertical: 4,
  },
  forgotText: {
    color: authColors.muted,
    fontSize: 14,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  signInPrompt: {
    color: authColors.textSecondary,
    fontSize: 14,
  },
  signInLink: {
    color: authColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
