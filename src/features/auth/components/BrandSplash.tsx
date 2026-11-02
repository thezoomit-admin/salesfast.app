import { useEffect } from 'react';
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
   * `blank` — brand background only (boot / route handoff; no logo flash).
   * `logo` — centered mark only (session restore / loading).
   * `animated` — logo in once → title + tagline below.
   */
  mode?: 'blank' | 'logo' | 'animated';
  /** Fired after animated sequence (+ hold). Only used when mode="animated". */
  onFinished?: () => void;
  holdMs?: number;
};

/** Same timing as Hisab BrandSplash. */
const LOGO_IN_MS = 560;
const TEXT_DELAY_MS = LOGO_IN_MS + 80;
const TEXT_IN_MS = 480;

/**
 * Brand splash — Hisab solid-bg pattern; Salesfast black matches logo plate.
 */
export function BrandSplash({
  mode = 'logo',
  onFinished,
  holdMs = 700,
}: Props) {
  const showLogo = mode !== 'blank';
  const logoOpacity = useSharedValue(mode === 'animated' ? 0 : 1);
  const logoScale = useSharedValue(mode === 'animated' ? 0.88 : 1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(28);

  useEffect(() => {
    if (mode !== 'animated') return;

    logoOpacity.value = 0;
    logoScale.value = 0.88;
    textOpacity.value = 0;
    textTranslateY.value = 28;

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
      withTiming(1, {
        duration: TEXT_IN_MS,
        easing: Easing.out(Easing.cubic),
      })
    );
    textTranslateY.value = withDelay(
      TEXT_DELAY_MS,
      withTiming(0, {
        duration: TEXT_IN_MS,
        easing: Easing.out(Easing.cubic),
      })
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
      <View style={styles.center}>
        {showLogo ? (
          <Animated.View style={logoStyle}>
            <Image source={favicon} style={styles.logo} resizeMode="contain" />
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
    // Solid black — matches favicon plate (Hisab uses solid brand brown).
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 24,
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
    color: authColors.white,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
});
