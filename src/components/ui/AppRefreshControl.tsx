import { requireNativeView, requireOptionalNativeModule } from 'expo';
import { useState } from 'react';
import {
  type ColorValue,
  Platform,
  processColor,
  RefreshControl,
  type RefreshControlProps,
} from 'react-native';

type NativeProps = Omit<
  RefreshControlProps,
  'colors' | 'progressBackgroundColor' | 'onRefresh'
> & {
  colors?: number[];
  progressBackgroundColor?: number;
  syncKey: number;
  onRefresh: () => void;
};

// modules/swipe-refresh. An install that got this JS over the air without the
// native view keeps React Native's own RefreshControl.
const NativeSwipeRefresh =
  Platform.OS === 'android' && requireOptionalNativeModule('SwipeRefresh')
    ? requireNativeView<NativeProps>('SwipeRefresh')
    : null;

const toColor = (color: ColorValue | null | undefined) => {
  const value = processColor(color);
  return typeof value === 'number' ? value : undefined;
};

/**
 * RefreshControl for every list and scroll view. On Android a pull starts
 * only on a clearly downward drag, so a sideways swipe (Leads tabs, chips,
 * the week strip) no longer pulls the spinner out or refreshes the page.
 */
export function AppRefreshControl(props: RefreshControlProps) {
  // Re-applies `refreshing` after a pull, even if it never changed in JS.
  const [syncKey, setSyncKey] = useState(0);

  if (!NativeSwipeRefresh) return <RefreshControl {...props} />;

  const {
    colors,
    progressBackgroundColor,
    onRefresh,
    // iOS only.
    tintColor: _tintColor,
    title: _title,
    titleColor: _titleColor,
    ...rest
  } = props;

  return (
    <NativeSwipeRefresh
      {...rest}
      colors={colors
        ?.map(toColor)
        .filter((c): c is number => c !== undefined)}
      progressBackgroundColor={toColor(progressBackgroundColor)}
      syncKey={syncKey}
      onRefresh={() => {
        setSyncKey((k) => k + 1);
        onRefresh?.();
      }}
    />
  );
}
