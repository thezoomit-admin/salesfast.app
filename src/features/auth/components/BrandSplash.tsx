import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { authColors } from '../authTheme';

const favicon = require('../../../../assets/images/salesfast-favicon.png');

type Props = {
  /**
   * `blank` — brand background only (boot / route handoff).
   * `logo` — centered mark (session restore / loading).
   * `animated` — logo in → title + tagline.
   */
  mode?: 'blank' | 'logo' | 'animated';
  onFinished?: () => void;
  holdMs?: number;
};

const LOGO_IN_MS = 560;
const TEXT_DELAY_MS = LOGO_IN_MS + 80;
const TEXT_IN_MS = 480;

/** Brand splash — replaces ActivityIndicator on initial load (Hisab pattern). */
export function BrandSplash({
  mode = 'logo',
  onFinished,
  holdMs = 700,
}: Props) {
  const showLogo = mode !== 'blank';
  const started = useRef(false);
  const logoOpacity = useSharedValue(mode === 'animated' ? 0 : 1);
  const logoScale = useSharedValue(mode === 'animated' ? 0.88 : 1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(28);

  useEffect(() => {
    if (mode !== 'animated' || started.current) return;
    started.current = true;

    logoOpacity.value = withTiming(1, {
      duration: LOGO_IN_MS,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: LOGO_IN_MS,
      easing: Easing.out(Easing.cubic),
    });

    textOpacity.value = withDelay(
      TEXT_DELAY_MS,
      withTiming(1, { duration: TEXT_IN_MS, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      TEXT_DELAY_MS,
      withTiming(0, { duration: TEXT_IN_MS, easing: Easing.out(Easing.cubic) })
    );

    if (!onFinished) return;

    const timer = setTimeout(() => {
      onFinished();
    }, TEXT_DELAY_MS + TEXT_IN_MS + holdMs);

    return () => clearTimeout(timer);
  }, [
    holdMs,
    logoOpacity,
    logoScale,
    mode,
    onFinished,
    textOpacity,
    textTranslateY,
  ]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Base: deep navy → ink */}
      <LinearGradient
        colors={['#1C2A3A', '#15202C', '#0E151C']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft brand glow — top left */}
      <LinearGradient
        colors={[
          'rgba(242, 70, 28, 0.34)',
          'rgba(242, 70, 28, 0.10)',
          'transparent',
        ]}
        locations={[0, 0.35, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 0.7 }}
        style={styles.glowTop}
        pointerEvents="none"
      />

      {/* Soft lift near center / logo */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.04)',
          'transparent',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0.25 }}
        end={{ x: 0.5, y: 0.85 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.center}>
        {showLogo ? (
          <Animated.View style={logoStyle}>
            <View style={styles.logoGlow}>
              <Image source={favicon} style={styles.logo} resizeMode="contain" />
            </View>
          </Animated.View>
        ) : null}
        {mode === 'animated' ? (
          <Animated.View style={[styles.textBlock, textStyle]}>
            <Text style={styles.name}>Salesfast</Text>
            <Text style={styles.tagline}>Smarter lead management</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authColors.splash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  logoGlow: {
    padding: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  logo: {
    width: 88,
    height: 88,
  },
  textBlock: {
    alignItems: 'center',
  },
  name: {
    marginTop: 22,
    color: authColors.white,
    fontWeight: '700',
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  tagline: {
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
});
