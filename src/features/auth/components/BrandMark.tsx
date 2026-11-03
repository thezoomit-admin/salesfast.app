import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

const appLogo = require('../../../../assets/images/favicon.png');
const fullLogo = require('../../../../assets/images/salesfast-logo.png');

type Props = {
  /** `wordmark` = full Salesfast CRM logo. `icon` = app mark only. */
  variant?: 'wordmark' | 'icon';
  size?: number;
};

export function BrandMark({ variant = 'wordmark', size = 56 }: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(isDark), [isDark]);

  if (variant === 'icon') {
    return (
      <Image
        source={appLogo}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.wordmarkWrap}>
      <Image
        source={fullLogo}
        style={styles.fullLogo}
        resizeMode="contain"
        accessibilityLabel="Salesfast"
      />
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    wordmarkWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      // Navy wordmark ink needs a light plate on dark screens.
      ...(isDark
        ? {
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 10,
          }
        : null),
    },
    fullLogo: {
      width: 188,
      height: 52,
    },
  });
}
