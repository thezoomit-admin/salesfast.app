import { Mail01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <BrandMark variant="icon" size={72} />
          <Text style={styles.welcomeTo}>Welcome to</Text>
          <Text style={styles.name}>Salesfast</Text>
        </View>

        <View style={styles.actions}>
          <AuthProviderButton
            label="Continue with Email"
            icon={
              <HugeiconsIcon
                icon={Mail01Icon}
                size={20}
                color={authColors.text}
                strokeWidth={1.8}
              />
            }
            onPress={() => router.push('/(auth)/login')}
          />
          <AuthProviderButton
            label="Continue with Phone"
            icon={
              <HugeiconsIcon
                icon={SmartPhone01Icon}
                size={20}
                color={authColors.text}
                strokeWidth={1.8}
              />
            }
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { mode: 'phone' },
              })
            }
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/login')}
            style={styles.forgotPress}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
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
    marginBottom: 36,
  },
  welcomeTo: {
    marginTop: 18,
    color: authColors.text,
    fontSize: 18,
    lineHeight: 26,
  },
  name: {
    marginTop: 2,
    color: authColors.text,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  actions: {
    width: '100%',
    alignSelf: 'stretch',
  },
  forgotPress: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  forgotText: {
    color: authColors.muted,
    fontSize: 14,
  },
});
