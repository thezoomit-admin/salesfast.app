import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/** 1 = the tab to the right, -1 = the tab to the left. */
export type SwipeDirection = 1 | -1;

type Props = {
  children: ReactNode;
  /** There is a tab to the left / right to move to. */
  canPrev: boolean;
  canNext: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  style?: StyleProp<ViewStyle>;
};

/** How far the finger must travel, or how fast, for a swipe to count. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.35;
const FLICK_MIN_DISTANCE = 24;
/** The content trails the finger by this much, so the swipe has feedback. */
const DRAG_FOLLOW = 0.35;
/** With no tab that way, it barely moves before springing back. */
const EDGE_FOLLOW = 0.12;
/** The new tab's content slides in from this far to the side. */
const ENTER_OFFSET = 48;

/**
 * Swipe left or right over the content to change tabs, like a pager. Only a
 * clearly sideways drag is taken, so the vertical list inside still scrolls
 * and its cards still take taps.
 *
 * Finger moves right → left: the next tab (on the right).
 * Finger moves left → right: the previous tab (on the left).
 */
export function SwipeTabArea({
  children,
  canPrev,
  canNext,
  onSwipe,
  style,
}: Props) {
  const [x] = useState(() => new Animated.Value(0));

  // The responder is built once, so a re-render mid-swipe can't reset it.
  const latest = useRef({ canPrev, canNext, onSwipe });
  useEffect(() => {
    latest.current = { canPrev, canNext, onSwipe };
  }, [canPrev, canNext, onSwipe]);

  const responder = useMemo(() => {
    const settle = () =>
      Animated.spring(x, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();

    // `latest` is read only inside the gesture callbacks, never during render.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.8,
      // Once sideways, keep it: the list must not pick it up as a scroll.
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const { canPrev: prev, canNext: next } = latest.current;
        const blocked = (g.dx > 0 && !prev) || (g.dx < 0 && !next);
        x.setValue(g.dx * (blocked ? EDGE_FOLLOW : DRAG_FOLLOW));
      },
      onPanResponderRelease: (_, g) => {
        const { canPrev: prev, canNext: next, onSwipe: swipe } = latest.current;
        const direction: SwipeDirection = g.dx < 0 ? 1 : -1;
        const far = Math.abs(g.dx) > SWIPE_DISTANCE;
        const flick =
          Math.abs(g.vx) > SWIPE_VELOCITY &&
          Math.abs(g.dx) > FLICK_MIN_DISTANCE;
        const allowed = direction === 1 ? next : prev;
        if (!(far || flick) || !allowed) {
          settle();
          return;
        }
        swipe(direction);
        // The new tab comes in from the side the finger pulled it from.
        x.setValue(direction * ENTER_OFFSET);
        Animated.timing(x, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: settle,
    });
  }, [x]);

  const opacity = x.interpolate({
    inputRange: [-ENTER_OFFSET * 2, 0, ENTER_OFFSET * 2],
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[{ flex: 1, opacity, transform: [{ translateX: x }] }, style]}
    >
      {children}
    </Animated.View>
  );
}
