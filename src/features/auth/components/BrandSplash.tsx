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
    backgroundColor: authColors.splash,
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
