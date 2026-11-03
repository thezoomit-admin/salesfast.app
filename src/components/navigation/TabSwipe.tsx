import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

/** Visual tab order — Home centered. Swipes move between neighbours here. */
export const TAB_ORDER = [
  'leads',
  'follow-ups',
  'index',
  'calls',
  'profile',
] as const;

export type TabName = (typeof TAB_ORDER)[number];

const TAB_HREF: Record<TabName, Href> = {
  leads: '/(tabs)/leads',
  'follow-ups': '/(tabs)/follow-ups',
  index: '/(tabs)',
  calls: '/(tabs)/calls',
  profile: '/(tabs)/profile',
};

/** Finger travel (px) or fling speed (px/ms) that commits a swipe. */
const SWIPE_DISTANCE = 64;
const SWIPE_VELOCITY = 0.35;
/** How far the incoming tab starts off-center. */
const ENTER_OFFSET = 56;

// Every tab stays mounted (lazy: false), so each registers its enter animation
// here; whoever switches tabs (swipe or tab bar) starts it before navigating.
const enterAnimations = new Map<TabName, (dir: 1 | -1) => void>();

/** Slide `to` in from the side it sits on relative to `from`. */
export function prepareTabEnter(from: string, to: string) {
  const fromIndex = TAB_ORDER.indexOf(from as TabName);
  const toIndex = TAB_ORDER.indexOf(to as TabName);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  enterAnimations.get(to as TabName)?.(toIndex > fromIndex ? 1 : -1);
}

function TabSwipeView({ tab, children }: { tab: TabName; children: ReactNode }) {
  const router = useRouter();
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const index = TAB_ORDER.indexOf(tab);

  useEffect(() => {
    enterAnimations.set(tab, (dir) => {
      translateX.setValue(dir * ENTER_OFFSET);
      opacity.setValue(0.4);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          speed: 22,
          bounciness: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => {
      enterAnimations.delete(tab);
    };
  }, [tab, translateX, opacity]);

  // A swiped-away tab is left at its drag offset; reset it once hidden.
  useFocusEffect(
    useCallback(
      () => () => {
        translateX.stopAnimation();
        translateX.setValue(0);
        opacity.setValue(1);
      },
      [translateX, opacity]
    )
  );

  const pan = useMemo(() => {
    // Finger moving left reveals the tab on the right, and vice versa.
    const neighbour = (dx: number): TabName | undefined =>
      TAB_ORDER[dx < 0 ? index + 1 : index - 1];

    const springBack = () =>
      Animated.spring(translateX, {
        toValue: 0,
        speed: 24,
        bounciness: 4,
        useNativeDriver: true,
      }).start();

    return PanResponder.create({
      // Clearly horizontal drags only — vertical lists and horizontal
      // scrollers (chips, carousels) keep their own gestures.
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => {
        // Rubber-band at the first / last tab.
        translateX.setValue(g.dx * (neighbour(g.dx) ? 0.5 : 0.15));
      },
      onPanResponderRelease: (_e, g) => {
        const target = neighbour(g.dx);
        const flungBack = g.vx * g.dx < 0 && Math.abs(g.vx) > 0.2;
        const committed =
          Math.abs(g.dx) > SWIPE_DISTANCE || Math.abs(g.vx) > SWIPE_VELOCITY;
        if (!target || flungBack || !committed) {
          springBack();
          return;
        }
        prepareTabEnter(tab, target);
        router.navigate(TAB_HREF[target]);
      },
      onPanResponderTerminate: springBack,
    });
  }, [index, tab, router, translateX]);

  return (
    <Animated.View
      style={[styles.root, { opacity, transform: [{ translateX }] }]}
      {...pan.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

/** Wrap a tab screen so horizontal swipes switch to the neighbouring tab. */
export function withTabSwipe<P extends object>(
  tab: TabName,
  Screen: ComponentType<P>
) {
  function SwipeableTab(props: P) {
    return (
      <TabSwipeView tab={tab}>
        <Screen {...props} />
      </TabSwipeView>
    );
  }
  SwipeableTab.displayName = `withTabSwipe(${Screen.displayName ?? Screen.name})`;
  return SwipeableTab;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
