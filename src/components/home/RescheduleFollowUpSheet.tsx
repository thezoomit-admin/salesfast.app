import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import {
  formatFollowupDateOnly,
  formatFollowupDisplay,
} from '@/features/leads/addNoteLogic';
import { addLeadNote } from '@/features/leads/leadsApi';
import { dashboardQuery } from '@/features/dashboard/dashboardApi';
import { radii, spacing, typography, useTheme, type ThemeColors } from '@/theme';

type Props = {
  open: boolean;
  leadId: number;
  leadName: string;
  followUpType: string | null;
  onClose: () => void;
  onSuccess?: () => void;
};

function defaultSlot() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  if (d.getMinutes() !== 0) d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

export function RescheduleFollowUpSheet({
  open,
  leadId,
  leadName,
  followUpType,
  onClose,
  onSuccess,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const queryClient = useQueryClient();
  const [when, setWhen] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setWhen(defaultSlot());
    setError(null);
  }, [open, leadId]);

  const mutation = useMutation({
    mutationFn: async (at: Date) => {
      await addLeadNote(leadId, {
        note: `Rescheduled overdue follow-up to ${formatFollowupDisplay(at)}.`,
        followupAt: at.toISOString(),
        followupDate: formatFollowupDateOnly(at),
        followupType: followUpType || 'FOLLOWUP',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['follow-up-leads'] }),
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
      ]);
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const canSave =
    !!when && when.getTime() > Date.now() && !mutation.isPending;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={mutation.isPending ? undefined : onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={mutation.isPending ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Reschedule follow-up</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {leadName}
          </Text>

          <FollowupDateTimeField
            label="New date & time"
            value={when}
            onChange={setWhen}
            disablePastDays
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={mutation.isPending}
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSave}
              onPress={() => {
                if (!when) return;
                if (when.getTime() <= Date.now()) {
                  setError('Pick a time in the future.');
                  return;
                }
                setError(null);
                mutation.mutate(when);
              }}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && canSave && styles.pressed,
                !canSave && styles.disabled,
              ]}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      gap: 14,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    title: {
      ...typography.subtitle,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: -8,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? colors.surfaceMuted : colors.primary50,
    },
    secondaryText: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    primaryBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.brand,
    },
    primaryText: {
      ...typography.subtitle,
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    pressed: { opacity: 0.88 },
    disabled: { opacity: 0.5 },
  });
}
