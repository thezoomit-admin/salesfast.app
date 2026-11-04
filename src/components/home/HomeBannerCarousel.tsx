import { memo, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { spacing, useTheme, type ThemeColors } from '@/theme';

type Banner = {
  key: string;
  source: ImageSourcePropType;
  label: string;
};

/** Add, remove or reorder banners here. Images should be 2:1. */
const BANNERS: Banner[] = [
  {
    key: 'banner-1',
    source: require('../../../assets/images/home-banners/banner-1.jpg'),
    label: 'Promotional banner 1',
  },
  {
    key: 'banner-2',
    source: require('../../../assets/images/home-banners/banner-2.jpg'),
    label: 'Promotional banner 2',
  },
  {
    key: 'banner-3',
    source: require('../../../assets/images/home-banners/banner-3.jpg'),
    label: 'Promotional banner 3',
  },
];

const SLOT_RATIO = 2;

function HomeBannerCarouselBase() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: windowWidth } = useWindowDimensions();
  const width = windowWidth - spacing.lg * 2;
  const height = Math.round(width / SLOT_RATIO);
  const [page, setPage] = useState(0);

  // Not onMomentumScrollEnd: Android also fires it on cancelled scrolls.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== page) setPage(next);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {BANNERS.map((banner) => (
          <Image
            key={banner.key}
            source={banner.source}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={banner.label}
            style={{ width, height }}
          />
        ))}
      </ScrollView>

      <View pointerEvents="none" style={styles.dots}>
        {BANNERS.map((banner, index) => (
          <View
            key={banner.key}
            style={[styles.dot, index === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

export const HomeBannerCarousel = memo(HomeBannerCarouselBase);

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      alignSelf: 'stretch',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.surfaceMuted,
    },
    dots: {
      position: 'absolute',
      bottom: 7,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    dotActive: {
      width: 14,
      backgroundColor: '#FFFFFF',
    },
  });
}
