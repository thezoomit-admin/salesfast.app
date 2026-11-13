import { HugeiconsIcon } from '@hugeicons/react-native';
import type { MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextInstance,
  type ViewInstance,
} from 'react-native';

import {
  Calendar03Icon,
  CallIcon,
  Home03Icon,
  Notification01Icon,
  PermanentJobIcon,
} from '@/components/icons/hugeicons';
import { useAuth } from '@/features/auth/AuthContext';
import { canViewAllLeads } from '@/features/auth/leadAccess';
import { useTheme, type ThemeColors } from '@/theme';

/** Visual tab order — Home centered. Also the page order of the pager. */
export function getTabOrder(canViewAll: boolean): readonly string[] {
  return canViewAll
    ? ['my-leads', 'leads', 'follow-ups', 'index', 'calls', 'notifications']
    : ['my-leads', 'follow-ups', 'index', 'calls', 'notifications'];
}

/** Default order for warm/prefetch when auth is not ready yet. */
export const TAB_ORDER = getTabOrder(false);

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

const TAB_ICONS: Record<string, HugeIconData> = {
  'my-leads': PermanentJobIcon,
  leads: PermanentJobIcon,
  'follow-ups': Calendar03Icon,
  index: Home03Icon,
  calls: CallIcon,
  notifications: Notification01Icon,
};

const TAB_LABELS: Record<string, string> = {
  'my-leads': 'My Leads',
  leads: 'Leads',
  'follow-ups': 'Follow-ups',
  index: 'Home',
  calls: 'Calls',
  notifications: 'Inbox',
};

type AppTabBarProps = MaterialTopTabBarProps & {
  /** Badge counts keyed by route name; 0 hides the badge. */
  badges?: Partial<Record<string, number>>;
};

export function AppTabBar({
  state,
  descriptors,
  emitter,
  jumpTo,
  insets,
  badges,
}: AppTabBarProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const canViewAll = canViewAllLeads(user);
  const tabOrder = useMemo(() => getTabOrder(canViewAll), [canViewAll]);
  // Real system inset only — edge-to-edge paints brand under the nav buttons.
  const systemInset = insets.bottom;
  const styles = useMemo(
    () => createStyles(colors, systemInset),
    [colors, systemInset]
  );

  const routesByName = Object.fromEntries(
    state.routes.map((route) => [route.name, route])
  );
  const focusedName = state.routes[state.index]?.name;

  // Finger-down highlight. It stays until the pager's index catches up —
  // clearing it on finger-up paints the previous tab again for the whole
  // time the next page takes to commit.
  const [pressedName, setPressedName] = useState<string | null>(null);
  const activeName = pressedName ?? focusedName;
  const paints = useRef(new Map<string, (active: boolean) => void>());
  const pendingName = useRef<string | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStarted = useRef(false);

  const registerPaint = useCallback(
    (name: string, paint: ((active: boolean) => void) | null) => {
      if (paint) paints.current.set(name, paint);
      else paints.current.delete(name);
    },
    []
  );

  const paintActive = useCallback(
    (name: string) => {
      for (const tab of tabOrder) paints.current.get(tab)?.(tab === name);
    },
    [tabOrder]
  );

  useEffect(() => {
    if (pressedName != null && pressedName === focusedName) {
      setPressedName(null);
      pendingName.current = null;
    }
  }, [pressedName, focusedName]);

  useEffect(
    () => () => {
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    []
  );

  const selectTab = useCallback(
    (name: string, routeKey: string, focused: boolean) => {
      // Native update first, so the colour is on screen before React commits
      // and before the next page renders.
      paintActive(name);
      setPressedName(name);
      if (focused) {
        emitter.emit({
          type: 'tabPress',
          target: routeKey,
          canPreventDefault: true,
        });
        return;
      }
      if (pendingName.current === name) return;
      const event = emitter.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (event.defaultPrevented) return;
      pendingName.current = name;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      // The highlight is already queued to native. jumpTo in this turn
      // re-renders the destination page before that paint, so the colour
      // waits on the page. The next turn moves the page.
      jumpTimer.current = setTimeout(() => {
        jumpTimer.current = null;
        jumpTo(routeKey);
      }, 0);
    },
    [emitter, jumpTo, paintActive]
  );

  const onTabPressIn = useCallback(
    (name: string, routeKey: string, focused: boolean) => {
      touchStarted.current = true;
      selectTab(name, routeKey, focused);
      // press follows press-in in this turn. A later keyboard press must not
      // see a flag left behind by a cancelled touch.
      setTimeout(() => {
        touchStarted.current = false;
      }, 0);
    },
    [selectTab]
  );

  const onTabPress = useCallback(
    (name: string, routeKey: string, focused: boolean) => {
      // A touch already selected on press-in. A keyboard activation only
      // delivers press.
      if (touchStarted.current) return;
      selectTab(name, routeKey, focused);
    },
    [selectTab]
  );

  const onTabLongPress = useCallback(
    (routeKey: string) => {
      emitter.emit({ type: 'tabLongPress', target: routeKey });
    },
    [emitter]
  );

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      <View style={styles.bar}>
        {tabOrder.map((name) => {
          const route = routesByName[name];
          if (!route) return null;

          const { options } = descriptors[route.key];
          const label = TAB_LABELS[name] ?? options.title ?? name;

          return (
            <TabItem
              // By name: a route's key changes when its page is preloaded.
              key={name}
              name={name}
              routeKey={route.key}
              styles={styles}
              colors={colors}
              icon={TAB_ICONS[name]}
              label={label}
              badge={badges?.[name] || undefined}
              active={activeName === name}
              focused={focusedName === name}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              registerPaint={registerPaint}
              onTabPressIn={onTabPressIn}
              onTabPress={onTabPress}
              onTabLongPress={onTabLongPress}
            />
          );
        })}
      </View>
      {/* Edge-to-edge: system nav is transparent — paint brand under the inset. */}
      {systemInset > 0 ? <View style={styles.systemBar} /> : null}
    </View>
  );
}

const TabIcon = memo(HugeiconsIcon);

type TabItemProps = {
  name: string;
  routeKey: string;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  icon: HugeIconData | undefined;
  label: string;
  badge: number | undefined;
  /** Drawn highlighted (follows the finger ahead of `focused`). */
  active: boolean;
  /** The navigator's current tab. */
  focused: boolean;
  accessibilityLabel: string;
  registerPaint: (name: string, paint: ((active: boolean) => void) | null) => void;
  onTabPressIn: (name: string, routeKey: string, focused: boolean) => void;
  onTabPress: (name: string, routeKey: string, focused: boolean) => void;
  onTabLongPress: (routeKey: string) => void;
};

/** Memoized: a tab switch re-renders only the two tabs whose colour changes. */
const TabItem = memo(function TabItem({
  name,
  routeKey,
  styles,
  colors,
  icon,
  label,
  badge,
  active,
  focused,
  accessibilityLabel,
  registerPaint,
  onTabPressIn,
  onTabPress,
  onTabLongPress,
}: TabItemProps) {
  const idleRef = useRef<ViewInstance>(null);
  const activeIconRef = useRef<ViewInstance>(null);
  const labelRef = useRef<TextInstance>(null);

  useLayoutEffect(() => {
    registerPaint(name, (isActive) => {
      // Opacity only — a partial `style` would drop the icon's layout.
      idleRef.current?.setNativeProps({ opacity: isActive ? 0 : 1 });
      activeIconRef.current?.setNativeProps({ opacity: isActive ? 1 : 0 });
      labelRef.current?.setNativeProps({
        style: {
          fontSize: 11,
          lineHeight: 14,
          color: isActive ? colors.brand : colors.textSecondary,
          fontWeight: isActive ? '600' : '500',
        },
      });
    });
    return () => registerPaint(name, null);
  }, [colors.brand, colors.textSecondary, name, registerPaint]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => onTabPressIn(name, routeKey, focused)}
      onPress={() => onTabPress(name, routeKey, focused)}
      onLongPress={() => onTabLongPress(routeKey)}
      style={styles.item}
    >
      <View style={styles.iconWrap}>
        {icon ? (
          <>
            {/* Both colours stay drawn, so a switch is one opacity change with
                no animation or SVG redraw. `collapsable` keeps these views
                from being flattened away when their opacity flips. */}
            <View
              ref={idleRef}
              collapsable={false}
              style={[styles.iconLayer, active && styles.iconHidden]}
            >
              <TabIcon
                icon={icon}
                size={24}
                color={colors.text}
                strokeWidth={1.7}
              />
            </View>
            <View
              ref={activeIconRef}
              collapsable={false}
              style={[styles.iconLayer, !active && styles.iconHidden]}
            >
              <TabIcon
                icon={icon}
                size={24}
                color={colors.brand}
                strokeWidth={2.1}
              />
            </View>
          </>
        ) : null}
        {badge != null ? (
          <View style={[styles.badge, { backgroundColor: colors.brand }]}>
            <Text style={styles.badgeText}>
              {badge > 99 ? '99+' : String(badge)}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        ref={labelRef}
        style={[
          styles.label,
          { color: active ? colors.brand : colors.textSecondary },
          active && styles.labelActive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
});

function createStyles(colors: ThemeColors, systemInset: number) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.brand,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingTop: 6,
      paddingBottom: 8,
      paddingHorizontal: 4,
      minHeight: 64,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    systemBar: {
      height: systemInset,
      backgroundColor: colors.brand,
    },
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      minHeight: 44,
      minWidth: 0,
    },
    iconWrap: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconLayer: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconHidden: {
      opacity: 0,
    },
    label: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '500',
    },
    labelActive: {
      fontWeight: '600',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -10,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: colors.white,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '700',
    },
  });
}
