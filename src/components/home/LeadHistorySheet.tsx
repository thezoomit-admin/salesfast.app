import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { getErrorMessage } from '@/api/client';
import { groupByDay, timeOf } from '@/features/leads/dayGroups';
import { buildHistoryEvents } from '@/features/leads/leadActivity';
import { leadDetailQuery } from '@/features/leads/leadsApi';
import { spacing, typography, useTheme, type ThemeColors } from '@/theme';

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;
const SHEET_OFFSCREEN = 560;
const OPEN_MS = 280;
const CLOSE_MS = 240;

type Props = {
  open: boolean;
  leadId: number | null;
  leadName: string;
  onClose: () => void;
};

/** Bottom sheet — account-switch chrome; shows this lead's activity history. */
export function LeadHistorySheet({
  open,
  leadId,
  leadName,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mounted, setMounted] = useState(false);

  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const query = useQuery({
    ...leadDetailQuery(leadId ?? 0),
    enabled: open && leadId != null && Number.isFinite(leadId),
  });

  const events = useMemo(
    () => (query.data ? buildHistoryEvents(query.data) : []),
    [query.data]
  );
  const groups = useMemo(
    () => groupByDay(events, (e) => e.date),
    [events]
  );

  const finishClose = (notifyParent: boolean) => {
    mountedRef.current = false;
    setMounted(false);
    translateY.setValue(SHEET_OFFSCREEN);
    backdropOp.setValue(0);
    closingRef.current = false;
    if (notifyParent) onCloseRef.current();
  };

  const runCloseAnimation = (notifyParent: boolean) => {
    if (closingRef.current) return;
    closingRef.current = true;
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
      if (finished) finishClose(notifyParent);
      else closingRef.current = false;
    });
  };

  const animateClose = () => {
    if (closingRef.current) return;
    runCloseAnimation(true);
  };

  useEffect(() => {
    if (open) {
      closingRef.current = false;
      mountedRef.current = true;
      setMounted(true);
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
    }

    if (!mountedRef.current || closingRef.current) return;
    runCloseAnimation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !closingRef.current,
        onMoveShouldSetPanResponder: (_, g) =>
          !closingRef.current &&
          g.dy > 4 &&
          Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => {
          if (g.dy > 0) translateY.setValue(g.dy);
        },
        onPanResponderRelease: (_, g) => {
          const shouldDismiss =
            g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY;
          if (shouldDismiss) {
            runCloseAnimation(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translateY, backdropOp]
  );

  if (!mounted && !open) return null;

  return (
    <Modal
      visible={mounted || open}
      transparent
      animationType="none"
      onRequestClose={animateClose}
    >
      <View style={styles.root} collapsable={false}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropFill, { opacity: backdropOp }]}
        />
        <TouchableWithoutFeedback
          onPress={animateClose}
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
            <Text style={styles.title}>History</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {leadName || 'Lead'}
            </Text>
          </View>

          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {query.isPending ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.brand} />
              </View>
            ) : query.isError ? (
              <Text style={styles.errorText}>
                {getErrorMessage(query.error, 'Could not load history')}
              </Text>
            ) : events.length === 0 ? (
              <Text style={styles.emptyText}>
                No history yet. Notes and status changes will show up here.
              </Text>
            ) : (
              groups.map((g) => (
                <View key={g.key} style={styles.group}>
                  <Text style={styles.dayLabel}>{g.label}</Text>
                  {g.items.map((e) => (
                    <View key={e.key} style={styles.row}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor:
                              e.kind === 'status'
                                ? colors.brand
                                : colors.accentSoft,
                          },
                        ]}
                      />
                      <View style={styles.card}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {e.title}
                          </Text>
                          <Text style={styles.cardTime}>{timeOf(e.date)}</Text>
                        </View>
                        {e.meta ? (
                          <Text style={styles.cardMeta}>{e.meta}</Text>
                        ) : null}
                        {e.body?.trim() ? (
                          <Text style={styles.cardBody}>{e.body.trim()}</Text>
                        ) : null}
                        <Text style={styles.cardBy}>
                          by {e.by?.trim() || 'System'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footerRule} />

          <Pressable
            accessibilityRole="button"
            onPress={animateClose}
            style={({ pressed }) => [
              styles.footerRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.footerLabel}>Close</Text>
          </Pressable>
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
      maxHeight: '78%',
    },
    dragZone: {
      paddingTop: 2,
      paddingBottom: 8,
    },
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
      paddingHorizontal: 2,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      paddingHorizontal: 2,
    },
    listScroll: {
      flexGrow: 0,
    },
    listContent: {
      paddingBottom: 8,
      gap: 10,
    },
    centerState: {
      paddingVertical: 28,
      alignItems: 'center',
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      paddingVertical: 16,
      paddingHorizontal: 2,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      paddingVertical: 16,
      paddingHorizontal: 2,
      lineHeight: 18,
    },
    group: { gap: 8 },
    dayLabel: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      paddingHorizontal: 2,
      marginTop: 4,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 14,
    },
    card: {
      flex: 1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 12,
      padding: spacing.md,
      gap: 4,
      backgroundColor: colors.surface,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    cardTitle: {
      ...typography.body,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    cardTime: {
      ...typography.caption,
      color: colors.textMuted,
    },
    cardMeta: {
      ...typography.caption,
      color: colors.brand,
      fontWeight: '500',
    },
    cardBody: {
      ...typography.body,
      color: colors.textSecondary,
    },
    cardBy: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    footerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 8,
      marginBottom: 4,
      marginHorizontal: -spacing.lg,
    },
    footerRow: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
    },
    footerLabel: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    pressed: { opacity: 0.72 },
  });
}
