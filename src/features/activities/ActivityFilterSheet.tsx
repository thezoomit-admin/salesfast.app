import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChip } from '@/components/ui/FilterChip';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

import { ACTIVITY_ICON, activityAccent } from './ActivityRow';
import {
  DATE_OPTIONS,
  NO_FILTERS,
  TYPE_OPTIONS,
  filterCount,
  type ActivityDateFilter,
  type ActivityFilters,
  type ActivityTypeFilter,
} from './activityFilters';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 760;
const OPEN_MS = 280;
const CLOSE_MS = 240;

type Props = {
  open: boolean;
  value: ActivityFilters;
  onApply: (filters: ActivityFilters) => void;
  onClose: () => void;
};

/** Bottom sheet — account-switch chrome. Picks apply on Apply, not on each tap. */
export function ActivityFilterSheet({ open, value, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  const [draft, setDraft] = useState(value);
  const [translateY] = useState(() => new Animated.Value(SHEET_OFFSCREEN));
  const [backdropOp] = useState(() => new Animated.Value(0));

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMounted(true);
      setDraft(value);
    }
  }

  useEffect(() => {
    if (!open) return;
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    const frame = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, translateY, backdropOp]);

  /** A second call restarts the slide; only the run that finishes closes. */
  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_OFFSCREEN,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setMounted(false);
      onClose();
    });
  }, [backdropOp, translateY, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
            close();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
            speed: 18,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        },
      }),
    [translateY, close]
  );

  const toggleType = (key: ActivityTypeFilter) =>
    setDraft((d) => {
      const picked = d.types.includes(key)
        ? d.types.filter((t) => t !== key)
        : [...d.types, key];
      // Option order, so the same picks always share one cached result.
      const types = TYPE_OPTIONS.map((o) => o.key).filter((k) => picked.includes(k));
      return { ...d, types };
    });

  const toggleDate = (key: ActivityDateFilter) =>
    setDraft((d) => {
      const picked = d.dates.includes(key)
        ? d.dates.filter((t) => t !== key)
        : [...d.dates, key];
      const dates = DATE_OPTIONS.map((o) => o.key).filter((k) => picked.includes(k));
      return { ...d, dates };
    });

  const apply = () => {
    onApply(draft);
    close();
  };

  if (!mounted) return null;

  const hasPicks = filterCount(draft) > 0;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <View style={styles.backdropHit} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <Text style={styles.title}>Filter activities</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>Date</Text>
            <View style={styles.chips}>
              {DATE_OPTIONS.map((option) => (
                <FilterChip
                  key={option.key}
                  label={option.label}
                  active={draft.dates.includes(option.key)}
                  onPress={() => toggleDate(option.key)}
                />
              ))}
            </View>

            <Text style={styles.heading}>Type</Text>
            {TYPE_OPTIONS.map((option) => {
              const checked = draft.types.includes(option.key);
              const accent = activityAccent(option.kind, colors, isDark);
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={option.label}
                  onPress={() => toggleType(option.key)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={[styles.icon, { backgroundColor: `${accent}26` }]}>
                    <Ionicons name={ACTIVITY_ICON[option.kind]} size={18} color={accent} />
                  </View>
                  <Text style={styles.rowLabel} numberOfLines={1}>
                    {option.label}
                  </Text>
                  <View
                    // Keeps its radius when the fill appears (flattened views lose it).
                    collapsable={false}
                    style={[styles.checkbox, checked && styles.checkboxOn]}
                  >
                    {checked ? (
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footerRule} />

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasPicks }}
              disabled={!hasPicks}
              onPress={() => setDraft(NO_FILTERS)}
              style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
            >
              <Text style={[styles.clearLabel, !hasPicks && styles.clearDisabled]}>
                Clear all
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={apply}
              style={({ pressed }) => [styles.applyBtn, pressed && styles.pressed]}
            >
              <Text style={styles.applyLabel}>Apply</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    backdropFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(17, 24, 39, 0.45)',
    },
    backdropHit: { flex: 1 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 20,
      maxHeight: '88%',
    },
    dragZone: { paddingTop: 2, paddingBottom: 4 },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      marginBottom: 14,
      backgroundColor: colors.border,
    },
    title: {
      ...typography.subtitle,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    scroll: { flexGrow: 0, flexShrink: 1 },
    heading: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      paddingHorizontal: 2,
    },
    icon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      ...typography.subtitle,
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.8,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },
    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 8,
      marginHorizontal: -spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: 12,
    },
    clearBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    clearLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    clearDisabled: { color: colors.textMuted },
    applyBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
      borderRadius: radii.pill,
      backgroundColor: colors.brand,
    },
    applyLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.white,
    },
    pressed: { opacity: 0.72 },
  });
}
