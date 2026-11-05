import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallIcon } from '@/components/icons/hugeicons';
import { AuthProviderButton } from '@/features/auth/components/AuthProviderButton';
import { BrandMark } from '@/features/auth/components/BrandMark';
import { BrandSplash } from '@/features/auth/components/BrandSplash';
import { promptContactAdmin } from '@/features/auth/contactAdmin';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme, type ThemeColors } from '@/theme';

/** Resets on hard reload / cold start so splash plays once per session. */
let splashPlayedThisSession = false;

export default function WelcomeScreen() {
  const { bootstrapping } = useAuth();
  const [showSplash, setShowSplash] = useState(!splashPlayedThisSession);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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

  const gradientColors = isDark
    ? ([
        'rgba(58, 131, 247, 0.22)',
        'rgba(58, 131, 247, 0.08)',
        'rgba(0, 0, 0, 0.92)',
        colors.background,
      ] as const)
    : ([
        'rgba(58, 131, 247, 0.14)',
        'rgba(201, 220, 251, 0.22)',
        'rgba(255, 255, 255, 0.96)',
        '#FFFFFF',
      ] as const);

  return (
    <View style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <LinearGradient
        colors={[...gradientColors]}
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
                  color={colors.text}
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

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: isDark ? colors.background : colors.white,
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
      color: colors.text,
      fontWeight: '700',
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.4,
    },
    brandItalic: {
      textAlign: 'center',
      color: colors.text,
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
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    primaryBtnPressed: {
      backgroundColor: colors.brandMuted,
    },
    primaryBtnText: {
      color: colors.white,
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
      backgroundColor: colors.border,
    },
    orText: {
      fontSize: 13,
      color: colors.textMuted,
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
      color: colors.textMuted,
      fontSize: 14,
    },
    signInLink: {
      color: colors.brand,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
