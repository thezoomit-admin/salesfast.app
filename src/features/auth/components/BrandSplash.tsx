import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { authColors } from '../authTheme';

const appLogo = require('../../../../assets/images/favicon.png');

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
const EASE_OUT = Easing.out(Easing.cubic);

/**
 * Brand splash — Hisab solid-bg pattern; Salesfast black matches logo plate.
 * Opacity / transform only, on the native driver (UI thread).
 */
export function BrandSplash({
  mode = 'logo',
  onFinished,
  holdMs = 700,
}: Props) {
  const showLogo = mode !== 'blank';
  const animated = mode === 'animated';
  // 0 → 1 progress of each step; static modes start finished.
  const [logoIn] = useState(() => new Animated.Value(animated ? 0 : 1));
  const [textIn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!animated) return;

    logoIn.setValue(0);
    textIn.setValue(0);
    const sequence = Animated.parallel([
      Animated.timing(logoIn, {
        toValue: 1,
        duration: LOGO_IN_MS,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(textIn, {
        toValue: 1,
        delay: TEXT_DELAY_MS,
        duration: TEXT_IN_MS,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]);
    sequence.start();

    const timer = onFinished
      ? setTimeout(onFinished, TEXT_DELAY_MS + TEXT_IN_MS + holdMs)
      : null;

    return () => {
      sequence.stop();
      if (timer) clearTimeout(timer);
    };
  }, [animated, holdMs, logoIn, onFinished, textIn]);

  const logoStyle = {
    opacity: logoIn,
    transform: [
      { scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
    ],
  };

  const textStyle = {
    opacity: textIn,
    transform: [
      { translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
    ],
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.center}>
        {showLogo ? (
          <Animated.View style={logoStyle}>
            <Image source={appLogo} style={styles.logo} resizeMode="contain" />
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
