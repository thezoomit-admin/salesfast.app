import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CallBlockedIcon,
  Clock01Icon,
  PhoneIncomingIcon,
  PhoneMissedIcon,
  PhoneOutgoingIcon,
} from '@/components/icons/hugeicons';
import { timeOf } from '@/features/leads/dayGroups';
import {
  type InboxPalette,
  inboxPalette,
  type InboxTone,
} from '@/features/notifications/inboxPalette';
import { useTheme } from '@/theme';
import { formatPhoneDisplay } from '@/utils/phone';

import type { CallSyncDirection } from './callSyncApi';
import type { RecentCall } from './useRecentCalls';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];
export type CallUiKind = 'incoming' | 'outgoing' | 'missed' | 'failed';

export const CALL_KIND: Record<
  CallUiKind,
  { icon: HugeIconData; tone: InboxTone; label: string }
> = {
  incoming: { icon: PhoneIncomingIcon, tone: 'blue', label: 'Incoming' },
  outgoing: { icon: PhoneOutgoingIcon, tone: 'green', label: 'Outgoing' },
  missed: { icon: PhoneMissedIcon, tone: 'red', label: 'Missed' },
  failed: { icon: CallBlockedIcon, tone: 'amber', label: 'Failed' },
};

export function callUiKind(direction: CallSyncDirection): CallUiKind {
  if (direction === 'INCOMING') return 'incoming';
  if (direction === 'OUTGOING') return 'outgoing';
  if (direction === 'MISSED') return 'missed';
  return 'failed';
}

function formatDuration(sec: number) {
  if (sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

type Props = {
  call: RecentCall;
  onPress: (call: RecentCall) => void;
};

/** Inbox card look — tinted direction icon | lead + number + time | kind chip. */
export const CallCard = memo(function CallCard({ call, onPress }: Props) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  const kind = CALL_KIND[callUiKind(call.direction)];
  const tint = palette.tones[kind.tone];
  const duration = formatDuration(call.durationSec);
  const time = timeOf(call.startedAt);
  const when = duration ? `${time}  •  ${duration}` : time;
  const phone = formatPhoneDisplay(call.phone);

  return (
    <Pressable
      onPress={() => onPress(call)}
      accessibilityRole="button"
      accessibilityLabel={`${kind.label} call, ${call.leadName}, ${phone}, ${when}`}
      accessibilityHint="Opens the lead"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
        <HugeiconsIcon
          icon={kind.icon}
          size={22}
          color={tint.fg}
          strokeWidth={1.8}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {call.leadName}
          </Text>
          <View style={[styles.chip, { backgroundColor: tint.bg }]}>
            <Text style={[styles.chipText, { color: tint.fg }]} numberOfLines={1}>
              {kind.label}
            </Text>
          </View>
        </View>

        <Text style={styles.note} numberOfLines={1}>
          {phone}
        </Text>

        <View style={styles.whenRow}>
          <HugeiconsIcon
            icon={Clock01Icon}
            size={13}
            color={palette.inkSoft}
            strokeWidth={1.6}
          />
          <Text style={styles.when} numberOfLines={1}>
            {when}
          </Text>
        </View>
      </View>

      <View style={styles.chevronSlot}>
        <Ionicons name="chevron-forward" size={16} color={palette.inkSoft} />
      </View>
    </Pressable>
  );
});

function createStyles(palette: InboxPalette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 53,
      paddingVertical: 7,
      paddingLeft: 12,
      paddingRight: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.cardBorder,
      backgroundColor: palette.card,
      boxShadow: '0 2px 6px rgba(40, 60, 140, 0.05)',
    },
    pressed: { opacity: 0.7 },
    iconWrap: {
      width: 41,
      height: 41,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '700',
      color: palette.ink,
      marginRight: 6,
    },
    chip: {
      height: 20,
      paddingHorizontal: 8,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '600',
    },
    note: {
      fontSize: 11,
      lineHeight: 15,
      color: palette.inkSoft,
    },
    whenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    when: {
      flexShrink: 1,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '500',
      color: palette.inkSoft,
    },
    chevronSlot: {
      width: 22,
      alignItems: 'flex-end',
    },
  });
}
