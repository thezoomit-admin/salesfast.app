import Ionicons from '@expo/vector-icons/Ionicons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CheckIcon,
  CircleCheckIcon,
  Clock01Icon,
  ClockAlertIcon,
  Tick02Icon,
} from '@/components/icons/hugeicons';
import {
  type InboxPalette,
  inboxPalette,
  type InboxTone,
} from '@/features/notifications/inboxPalette';
import { useTheme } from '@/theme';
import { formatClockTime, formatDueDay } from '@/utils/dates';

import {
  isDueToday,
  isOpenStatus,
  isTaskOverdue,
  leadTitleOf,
  type LeadTask,
} from './tasksApi';

type HugeIconData = ComponentProps<typeof HugeiconsIcon>['icon'];

type TaskUi = {
  icon: HugeIconData;
  tone: InboxTone;
  chip: string;
};

function taskUi(task: LeadTask): TaskUi {
  if (task.status === 'DONE') {
    return { icon: CircleCheckIcon, tone: 'green', chip: 'Done' };
  }
  if (task.status === 'CANCELLED') {
    return { icon: ClockAlertIcon, tone: 'red', chip: 'Cancelled' };
  }
  if (isTaskOverdue(task.dueDate, task.status)) {
    return { icon: ClockAlertIcon, tone: 'red', chip: 'Overdue' };
  }
  if (task.status === 'IN_PROGRESS') {
    return { icon: Tick02Icon, tone: 'amber', chip: 'In progress' };
  }
  if (isDueToday(task.dueDate)) {
    return { icon: Clock01Icon, tone: 'sky', chip: 'Today' };
  }
  return { icon: Clock01Icon, tone: 'blue', chip: 'Open' };
}

function whenLabel(task: LeadTask) {
  if (task.status === 'DONE' && task.completedAt) {
    return formatDueDay(task.completedAt);
  }
  if (!task.dueDate) return 'No due date';
  if (isDueToday(task.dueDate)) {
    const time = formatClockTime(task.dueDate);
    return time === '—' ? 'Due today' : `Today · ${time}`;
  }
  if (isTaskOverdue(task.dueDate, task.status)) {
    return `Overdue · ${formatDueDay(task.dueDate)}`;
  }
  return formatDueDay(task.dueDate);
}

type Props = {
  task: LeadTask;
  onOpen: (leadId: number) => void;
  onComplete?: (task: LeadTask) => void;
  completing?: boolean;
};

/** Inbox card look — tinted status icon | title + lead + due | chip / check. */
export const TaskRow = memo(function TaskRow({
  task,
  onOpen,
  onComplete,
  completing,
}: Props) {
  const { resolved } = useTheme();
  const palette = inboxPalette(resolved === 'dark');
  const styles = useMemo(() => createStyles(palette), [palette]);

  const ui = taskUi(task);
  const tint = palette.tones[ui.tone];
  const lead = leadTitleOf(task);
  const when = whenLabel(task);
  const open = isOpenStatus(task.status);

  return (
    <Pressable
      onPress={() => onOpen(task.leadId)}
      accessibilityRole="button"
      accessibilityLabel={`${task.title}, ${lead}, ${when}, ${ui.chip}`}
      accessibilityHint="Opens the lead"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: tint.bg }]}>
        <HugeiconsIcon
          icon={ui.icon}
          size={22}
          color={tint.fg}
          strokeWidth={1.8}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.chip, { backgroundColor: tint.bg }]}>
            <Text style={[styles.chipText, { color: tint.fg }]} numberOfLines={1}>
              {ui.chip}
            </Text>
          </View>
        </View>

        <Text style={styles.note} numberOfLines={1}>
          {lead}
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

      {open && onComplete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark task done"
          disabled={completing}
          hitSlop={8}
          onPress={() => onComplete(task)}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: palette.tones.green.bg },
            (pressed || completing) && styles.pressed,
          ]}
        >
          <HugeiconsIcon
            icon={CheckIcon}
            size={16}
            color={palette.tones.green.fg}
            strokeWidth={2.4}
          />
        </Pressable>
      ) : (
        <View style={styles.chevronSlot}>
          <Ionicons name="chevron-forward" size={16} color={palette.inkSoft} />
        </View>
      )}
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
    doneBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    chevronSlot: {
      width: 22,
      alignItems: 'flex-end',
    },
  });
}
