import { CallIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProviderButton } from '@/features/auth/components/AuthProviderButton';
import { BrandMark } from '@/features/auth/components/BrandMark';
import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { authColors } from '@/features/auth/authTheme';
import { promptContactAdmin } from '@/features/auth/contactAdmin';
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
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[
          'rgba(242, 70, 28, 0.14)',
          'rgba(251, 210, 194, 0.22)',
          'rgba(255, 255, 255, 0.96)',
          '#FFFFFF',
        ]}
        locations={[0, 0.2, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + 28,
            paddingBottom: Math.max(insets.bottom, 28),
          },
        ]}
      >
        <View style={styles.topLogo}>
          <BrandMark variant="wordmark" />
        </View>

        <View style={styles.middle}>
          <Text style={styles.welcomeLine}>Welcome to the</Text>
          <Text style={styles.brandItalic}>Salesfast</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/login')}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed ? styles.primaryBtnPressed : null,
              ]}
            >
              <Text style={styles.primaryBtnText}>Continue With Email</Text>
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>

            <AuthProviderButton
              label="Continue with Phone"
              icon={
                <HugeiconsIcon
                  icon={CallIcon}
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
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.signInRow}>
            <Text style={styles.signInPrompt}>Need an account? </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => promptContactAdmin()}
              hitSlop={6}
            >
              <Text style={styles.signInLink}>Contact Us</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.white,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  topLogo: {
    alignItems: 'center',
    paddingTop: 8,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  welcomeLine: {
    textAlign: 'center',
    color: authColors.text,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  brandItalic: {
    textAlign: 'center',
    color: authColors.text,
    fontStyle: 'italic',
    fontWeight: '600',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: 36,
  },
  actions: {
    width: '100%',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtnPressed: {
    backgroundColor: authColors.primaryPressed,
  },
  primaryBtnText: {
    color: authColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 4,
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
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  signInPrompt: {
    color: authColors.muted,
    fontSize: 14,
  },
  signInLink: {
    color: authColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
