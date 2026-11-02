import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  CancelCircleIcon,
  Tick02Icon,
  TrophyIcon,
} from '@/components/icons/hugeicons';
import {
  buildPipelineSteps,
  isLostStatus,
  isWonStatus,
  shortPipelineLabel,
  type PipelineStatus,
} from '@/features/leads/leadPipeline';
import { spacing, typography, useThemeColors, type ThemeColors } from '@/theme';

type Props = {
  statuses: PipelineStatus[];
  currentStatusId?: number | null;
  assignedToName?: string | null;
  onStepPress?: (statusId: number | null) => void;
};

const NODE = 28;

export function LeadPipeline({
  statuses,
  currentStatusId,
  assignedToName,
  onStepPress,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const steps = useMemo(() => buildPipelineSteps(statuses), [statuses]);
  const currentIdx = steps.findIndex((s) =>
    currentStatusId != null ? s.statusIds.includes(currentStatusId) : false
  );
  const currentIsLost = isLostStatus(
    statuses.find((s) => s.id === currentStatusId) ?? null
  );
  const progressPct =
    steps.length <= 1 || currentIdx < 0
      ? 0
      : (Math.min(currentIdx + 1, steps.length - 1) / (steps.length - 1)) * 100;

  if (!steps.length) return null;

  const stepW = width > 0 ? width / steps.length : 0;
  const trackInset = stepW / 2;
  const nodeSize = steps.length > 6 ? 24 : NODE;
  const iconSize = steps.length > 6 ? 12 : 14;
  const labelSize = steps.length > 6 ? 9 : 10;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 0.5) setWidth(w);
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={[styles.trackRow, { height: nodeSize }]}>
        {width > 0 ? (
          <View
            style={[
              styles.trackBg,
              {
                left: trackInset,
                right: trackInset,
                top: nodeSize / 2 - 1.5,
              },
            ]}
          >
            <View
              style={[
                styles.trackFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: currentIsLost
                    ? colors.danger
                    : colors.brand,
                },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.nodesRow}>
          {steps.map((step, i) => {
            const done = currentIdx >= 0 && i <= currentIdx;
            const next = currentIdx >= 0 && i === currentIdx + 1;
            const current = i === currentIdx;
            const activeTerminal =
              step.isTerminal && current
                ? step.statuses.find((s) => s.id === currentStatusId)
                : null;
            const stepIsLost = !!(
              activeTerminal && isLostStatus(activeTerminal)
            );
            const stepIsWon = !!(
              activeTerminal && isWonStatus(activeTerminal)
            );
            const nodeColor = stepIsLost
              ? colors.danger
              : done || next
                ? colors.brand
                : '#D1D5DB';
            const iconColor = done ? '#fff' : next ? nodeColor : '#9CA3AF';
            const stepIcon = stepIsLost
              ? CancelCircleIcon
              : stepIsWon
                ? TrophyIcon
                : step.icon;
            const opensNote =
              i > currentIdx &&
              !/^(draft|assign)$/i.test(
                String(step.statuses[0]?.name ?? '').trim()
              );

            return (
              <Pressable
                key={step.key}
                disabled={!opensNote}
                onPress={() =>
                  onStepPress?.(
                    step.isTerminal ? null : (step.statuses[0]?.id ?? null)
                  )
                }
                style={styles.nodeSlot}
              >
                <View
                  style={[
                    styles.node,
                    {
                      width: nodeSize,
                      height: nodeSize,
                      borderColor: nodeColor,
                      backgroundColor: done ? nodeColor : colors.surface,
                    },
                    next && styles.nodeActive,
                  ]}
                >
                  {done && !activeTerminal ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={iconSize}
                      color="#fff"
                      strokeWidth={2.2}
                    />
                  ) : (
                    <HugeiconsIcon
                      icon={stepIcon}
                      size={iconSize}
                      color={iconColor}
                      strokeWidth={done || next ? 2 : 1.7}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.labelsRow}>
        {steps.map((step, i) => {
          const current = i === currentIdx;
          const filled = currentIdx >= 0 && i <= currentIdx + 1;
          const activeTerminal =
            step.isTerminal && current
              ? step.statuses.find((s) => s.id === currentStatusId)
              : null;
          let label = activeTerminal
            ? shortPipelineLabel(String(activeTerminal.name ?? ''))
            : step.label;
          if (
            i <= currentIdx &&
            assignedToName &&
            step.statuses[0]?.name?.trim().toLowerCase() === 'assign'
          ) {
            const short = assignedToName.split(/\s+/)[0] ?? assignedToName;
            label = `Assign by ${short}`;
          }
          return (
            <View key={`${step.key}-label`} style={styles.labelSlot}>
              <Text
                style={[
                  styles.label,
                  { fontSize: labelSize, lineHeight: labelSize + 3 },
                  filled ? styles.labelFilled : styles.labelMuted,
                ]}
                numberOfLines={2}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    trackRow: {
      justifyContent: 'center',
      width: '100%',
    },
    trackBg: {
      position: 'absolute',
      height: 3,
      borderRadius: 999,
      backgroundColor: '#E5E7EB',
      overflow: 'hidden',
    },
    trackFill: {
      height: '100%',
      borderRadius: 999,
    },
    nodesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      zIndex: 1,
    },
    nodeSlot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    node: {
      borderRadius: 999,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeActive: {
      shadowColor: colors.brand,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    },
    labelsRow: {
      flexDirection: 'row',
      marginTop: 6,
      alignItems: 'flex-start',
      width: '100%',
    },
    labelSlot: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 1,
      minWidth: 0,
    },
    label: {
      ...typography.caption,
      textAlign: 'center',
    },
    labelFilled: {
      fontWeight: '700',
      color: colors.text,
    },
    labelMuted: {
      fontWeight: '500',
      color: colors.textMuted,
    },
  });
}
