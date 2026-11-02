import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radii, useThemeColors, type ThemeColors } from '@/theme';

/** Shared opacity pulse for page skeletons. */
export function useSkeletonPulse() {
  const [pulse] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

export function SkeletonPulse({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useSkeletonPulse();
  return (
    <Animated.View
      style={[style, { opacity: pulse }]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {children}
    </Animated.View>
  );
}

type BoneProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Soft filled bar / block used inside page skeletons. */
export function SkeletonBone({
  width = '100%',
  height = 12,
  radius = radii.sm,
  style,
}: BoneProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createBoneStyles(colors), [colors]);
  return (
    <View
      style={[
        styles.bone,
        { width, height, borderRadius: radius },
        style,
      ]}
    />
  );
}

function createBoneStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bone: {
      backgroundColor: colors.surfaceMuted,
    },
  });
}
