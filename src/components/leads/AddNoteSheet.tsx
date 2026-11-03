import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/client';
import {
  ArrowDownDoubleIcon,
  FlameIcon,
  MinusSignIcon,
  UserIcon,
} from '@/components/icons/hugeicons';
import { FollowupDateTimeField } from '@/components/leads/FollowupDateTimeField';
import { SuccessSheet } from '@/components/ui/SuccessSheet';
import {
  BOTH,
  NOTE_CHANNELS,
  buildStatusPayload,
  followupTypeOf,
  formatFollowupDateOnly,
  formatFollowupDisplay,
  isLostStageName,
  isVisitInterest,
  isVisited,
  isWonStageName,
  serializeActivityFlow,
  stageChoicesOf,
  stageNeedsRating,
  stageOptionsOf,
  sortByOrder,
  type PipelineStatusOption,
} from '@/features/leads/addNoteLogic';
import {
  addLeadNote,
  noteChannelsQuery,
  updateLead,
  updateLeadPriority,
} from '@/features/leads/leadsApi';
import { patchLeadInLists } from '@/features/leads/leadDetailCache';
import { iconForStageName } from '@/features/leads/leadPipeline';
import {
  PRIORITIES,
  PRIORITY_META,
  priorityBadgeColors,
} from '@/features/leads/leadPriority';
import { uploadMediaFile } from '@/features/leads/mediaUpload';
import {
  radii,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@/theme';
import type { LeadDetail, LeadPriority } from '@/types/api';
import { formatPhoneDisplay } from '@/utils/phone';

type Props = {
  visible: boolean;
  lead: LeadDetail;
  statuses: PipelineStatusOption[];
  accountId?: string;
  initialStageId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
};

type VoiceClip = {
  id: string;
  uri: string;
  name: string;
  durationSec: number;
  mimeType: string;
};

const PRIORITY_ICON = {
  LOW: ArrowDownDoubleIcon,
  MEDIUM: MinusSignIcon,
  HIGH: FlameIcon,
} as const;

const CHANNEL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  Call: 'call-outline',
  WhatsApp: 'logo-whatsapp',
  'In person': 'person-outline',
};

function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** Playback waveform bars — same silhouette as web NoteComposer. */
const PLAYBACK_BARS = [
  5, 9, 6, 14, 8, 16, 7, 12, 10, 15, 6, 11, 9, 17, 8, 13, 5, 14, 10, 16, 7, 12,
  9, 15, 6, 11, 8, 14, 10, 13, 7, 16, 9, 12, 5, 11, 8, 15, 6, 10,
];

const WAVE_UNFILLED = '#D0D5DD';
const CHIP_X_BG = '#15202C';

function ProgressWaveform({
  progress,
  brand,
  onSeek,
}: {
  progress: number;
  brand: string;
  onSeek: (fraction: number) => void;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const widthRef = useRef(0);

  function seekAt(x: number) {
    const w = widthRef.current;
    if (!w) return;
    onSeek(Math.min(1, Math.max(0, x / w)));
  }

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      style={waveStyles.progressTrack}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => seekAt(e.nativeEvent.locationX)}
      onResponderMove={(e) => seekAt(e.nativeEvent.locationX)}
    >
      {PLAYBACK_BARS.map((h, i) => {
        const filled = i / PLAYBACK_BARS.length < p;
        return (
          <View
            key={i}
            style={[
              waveStyles.playbackBar,
              {
                height: h,
                backgroundColor: filled ? brand : WAVE_UNFILLED,
              },
            ]}
          />
        );
      })}
      <View
        pointerEvents="none"
        style={[
          waveStyles.scrubThumb,
          { left: `${p * 100}%`, backgroundColor: brand },
        ]}
      />
    </View>
  );
}

const waveStyles = StyleSheet.create({
  progressTrack: {
    position: 'relative',
    flex: 1,
    minWidth: 120,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  playbackBar: {
    width: 2,
    borderRadius: 999,
  },
  scrubThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

export function AddNoteSheet({
  visible,
  lead,
  statuses,
  accountId,
  initialStageId,
  onClose,
  onSaved,
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const queryClient = useQueryClient();
  const channelsQuery = useQuery({
    ...noteChannelsQuery,
    enabled: visible,
  });

  const recordingOptions = useMemo(
    () => ({
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
      numberOfChannels: 1,
    }),
    []
  );
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [visitPick, setVisitPick] = useState<string | undefined>();
  const [channelId, setChannelId] = useState<number | null>(null);
  const [rating, setRating] = useState<LeadPriority | null>(null);
  const [followupAt, setFollowupAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [clips, setClips] = useState<VoiceClip[]>([]);
  const [recording, setRecording] = useState(false);
  const recordStartedAt = useRef(0);
  const [recordSec, setRecordSec] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playDisplaySec, setPlayDisplaySec] = useState(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const versionRef = useRef<number | undefined>(undefined);

  const channels = useMemo(() => {
    const all = channelsQuery.data ?? [];
    return NOTE_CHANNELS.flatMap(({ label, match }) => {
      const c = all.find((ch) => match.test(String(ch.name ?? '').trim()));
      return c ? [{ id: c.id, name: c.name, label }] : [];
    });
  }, [channelsQuery.data]);

  const leadStatusId = lead.leadStatus?.id ?? null;
  const { choices, coldCalling } = useMemo(
    () => stageChoicesOf(statuses, leadStatusId),
    [statuses, leadStatusId]
  );

  const target =
    sortByOrder(choices.filter((s) => picked.includes(s.id))).pop() ?? null;
  const via =
    coldCalling &&
    target &&
    target.id !== coldCalling.id &&
    picked.includes(coldCalling.id)
      ? coldCalling
      : null;
  const isLost = isLostStageName(target);
  const isWon = isWonStageName(target);
  const terminal = isLost || isWon;

  const ownVisitOptions = stageOptionsOf(target);
  const visitOptions =
    target && (isVisitInterest(target) || isVisited(target))
      ? ownVisitOptions.length || !isVisitInterest(target)
        ? ownVisitOptions
        : stageOptionsOf(statuses.find(isVisited))
      : [];
  const followupRequired = isVisitInterest(target);

  useEffect(() => {
    if (!visible) return;
    setSuccessOpen(false);
    setNote('');
    setVisitPick(undefined);
    setChannelId(null);
    setFollowupAt(null);
    setPriorityOpen(false);
    setClips([]);
    setRecording(false);
    setRecordSec(0);
    stopPlayback(true);
    setRating((lead.priority as LeadPriority | null) ?? null);
    versionRef.current = lead.version ?? undefined;
    const preset =
      initialStageId != null &&
      initialStageId !== coldCalling?.id &&
      choices.some((s) => s.id === initialStageId)
        ? [initialStageId]
        : [];
    setPicked([...(coldCalling ? [coldCalling.id] : []), ...preset]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      setRecordSec(
        Math.floor((Date.now() - recordStartedAt.current) / 1000)
      );
    }, 250);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (!playingId || paused) return;
    const clip = clips.find((c) => c.id === playingId);
    if (!clip) return;
    const t = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      syncPlayUi(clip);
      if (!player.playing) {
        const dur =
          clip.durationSec > 0
            ? clip.durationSec
            : player.duration > 0
              ? player.duration
              : 0;
        if (dur > 0 && player.currentTime >= dur - 0.08) {
          setPlayingId(null);
          setPaused(false);
          setPlayProgress(0);
          setPlayDisplaySec(clip.durationSec);
        } else {
          setPaused(true);
        }
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId, paused, clips]);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.pause();
        playerRef.current?.remove();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, []);

  function stopPlayback(reset = false) {
    try {
      playerRef.current?.pause();
    } catch {
      /* ignore */
    }
    if (reset) {
      try {
        playerRef.current?.remove();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      setPlayingId(null);
      setPaused(false);
      setPlayProgress(0);
      setPlayDisplaySec(0);
    }
  }

  function syncPlayUi(clip: VoiceClip) {
    const player = playerRef.current;
    if (!player) return;
    const meta = player.duration;
    const dur =
      clip.durationSec > 0
        ? clip.durationSec
        : Number.isFinite(meta) && meta > 0
          ? meta
          : 0;
    if (!dur) return;
    const cur = Math.min(player.currentTime || 0, dur);
    setPlayProgress(Math.min(1, cur / dur));
    setPlayDisplaySec(Math.max(0, dur - cur));
  }

  async function ensurePlayer(clip: VoiceClip) {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });
    if (!playerRef.current) {
      playerRef.current = createAudioPlayer(clip.uri);
      setPlayProgress(0);
      setPlayDisplaySec(clip.durationSec);
    } else if (playingId !== clip.id) {
      playerRef.current.replace(clip.uri);
      setPlayProgress(0);
      setPlayDisplaySec(clip.durationSec);
    }
    setPlayingId(clip.id);
    return playerRef.current;
  }

  async function togglePlay(clip: VoiceClip) {
    try {
      if (playingId === clip.id && playerRef.current?.playing) {
        playerRef.current.pause();
        syncPlayUi(clip);
        setPaused(true);
        return;
      }
      const player = await ensurePlayer(clip);
      player.play();
      setPaused(false);
    } catch {
      Alert.alert('Could not play voice note');
      setPlayingId(null);
      setPaused(false);
    }
  }

  async function seekClip(clip: VoiceClip, fraction: number) {
    try {
      const player = await ensurePlayer(clip);
      const meta = player.duration;
      const dur =
        clip.durationSec > 0
          ? clip.durationSec
          : Number.isFinite(meta) && meta > 0
            ? meta
            : 0;
      if (!dur) return;
      await player.seekTo(fraction * dur);
      setPlayProgress(fraction);
      setPlayDisplaySec(Math.max(0, dur - fraction * dur));
      setPaused(!player.playing);
    } catch {
      /* ignore seek errors */
    }
  }

  const priorityMutation = useMutation({
    mutationFn: (next: LeadPriority) =>
      updateLeadPriority(
        lead.id,
        {
          priority: next,
          expectedVersion: versionRef.current,
        },
        { accountId }
      ),
    onMutate: (next) => {
      const prev = rating;
      const prevLists = queryClient
        .getQueriesData({ queryKey: ['my-leads'] })
        .concat(queryClient.getQueriesData({ queryKey: ['my-follow-ups'] }));
      setRating(next);
      setPriorityOpen(false);
      patchLeadInLists(queryClient, lead.id, { priority: next });
      return { prev, prevLists };
    },
    onSuccess: (updated) => {
      versionRef.current = updated?.version ?? versionRef.current;
      queryClient.setQueryData(['lead', lead.id], updated);
      if (updated) {
        patchLeadInLists(queryClient, lead.id, {
          priority: updated.priority ?? null,
          updatedAt: updated.updatedAt,
        });
      }
      onSaved?.();
    },
    onError: (_e, _n, ctx) => {
      if (ctx?.prev !== undefined) setRating(ctx.prev);
      if (ctx?.prevLists) {
        for (const [key, data] of ctx.prevLists) {
          queryClient.setQueryData(key, data);
        }
      }
      Alert.alert('Could not update priority');
    },
  });

  function toggleStage(s: PipelineStatusOption) {
    setVisitPick(undefined);
    setPicked((cur) => {
      if (coldCalling) {
        if (s.id === coldCalling.id) {
          return cur.length > 1
            ? [coldCalling.id]
            : cur.length
              ? []
              : [coldCalling.id];
        }
        return cur.includes(s.id)
          ? [coldCalling.id]
          : [coldCalling.id, s.id];
      }
      return cur.includes(s.id) ? [] : [s.id];
    });
  }

  async function startRecording() {
    try {
      stopPlayback(true);

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone permission needed',
          'Allow microphone access in system settings to record voice notes.'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });

      // Native recorder throws if prepared twice — reset first.
      try {
        const status = recorder.getStatus();
        if (status.canRecord || status.isRecording) {
          await recorder.stop();
        }
      } catch {
        /* ignore — nothing to stop */
      }

      await recorder.prepareToRecordAsync();
      recordStartedAt.current = Date.now();
      setRecordSec(0);
      recorder.record();
      setRecording(true);
    } catch (err) {
      setRecording(false);
      const msg = getErrorMessage(err);
      Alert.alert(
        'Could not start recording',
        msg || 'Check microphone permission and try again.'
      );
    }
  }

  async function stopRecording() {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const elapsed = Math.max(
        1,
        Math.round((Date.now() - recordStartedAt.current) / 1000)
      );
      setRecording(false);
      setRecordSec(0);
      if (!uri) return;
      setClips((prev) => [
        ...prev,
        {
          id: `rec-${Date.now()}`,
          uri,
          name: `Voice note ${formatDuration(elapsed)}`,
          durationSec: elapsed,
          mimeType: 'audio/m4a',
        },
      ]);
    } catch {
      setRecording(false);
      Alert.alert('Could not save recording');
    }
  }

  async function pickAudioFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setClips((prev) => [
        ...prev,
        {
          id: `file-${Date.now()}`,
          uri: asset.uri,
          name: asset.name || 'Audio file',
          durationSec: 0,
          mimeType: asset.mimeType || 'audio/mpeg',
        },
      ]);
    } catch {
      Alert.alert('Could not pick audio file');
    }
  }

  const hasNote = !!note.trim() || clips.length > 0;
  const canSave =
    hasNote && (!followupRequired || !!followupAt) && !saving && !recording;

  async function handleSave() {
    if (!canSave) return;
    let noteText = note.trim();
    if (!noteText && clips.length === 0) {
      Alert.alert('Write a note');
      return;
    }
    if (followupAt && followupAt.getTime() <= Date.now()) {
      Alert.alert('Pick a time in the future');
      return;
    }

    setSaving(true);
    let moved = false;
    try {
      // Upload voice clips first — append markdown links like web NoteComposer.
      for (const clip of clips) {
        const uploaded = await uploadMediaFile(
          clip.uri,
          clip.name,
          clip.mimeType,
          { accountId }
        );
        noteText = `${noteText}\n[${uploaded.name}](${uploaded.url})`.trim();
      }
      if (!noteText) {
        Alert.alert('Write a note');
        return;
      }

      const stageOption =
        visitPick === BOTH
          ? visitOptions.join(' + ') || undefined
          : visitPick;
      const steps = target ? [...(via ? [via] : []), target] : [];
      let fromId = leadStatusId;

      for (const step of steps) {
        const last = step.id === target!.id;
        const payload = buildStatusPayload({
          leadStatusId: step.id,
          currentStatusId: fromId,
          contactId: null,
          version: versionRef.current,
          stageRating: stageNeedsRating(step) ? rating : undefined,
          stageOption:
            last && ownVisitOptions.length ? stageOption : undefined,
          isWon: isWonStageName(step),
          isLost: isLostStageName(step),
          statusNote: last && !followupAt ? noteText : undefined,
          statusChannelId:
            last && !followupAt && channelId != null ? channelId : undefined,
        });
        if (!payload) continue;
        const updated = await updateLead(lead.id, payload, { accountId });
        versionRef.current = updated?.version ?? versionRef.current;
        queryClient.setQueryData(['lead', lead.id], updated);
        fromId = step.id;
        moved = true;
      }

      if (!moved || followupAt) {
        const payload: {
          note: string;
          channelId?: number;
          followupAt?: string;
          followupDate?: string;
          followupType?: string;
        } = { note: noteText };
        if (channelId != null) payload.channelId = channelId;
        if (followupAt) {
          const followupType = followupTypeOf(target, stageOption);
          const typeLabel =
            followupType === 'OFFICE_VISIT'
              ? 'Office visit'
              : followupType === 'SITE_VISIT'
                ? 'Site visit'
                : 'Follow-up';
          const flow = serializeActivityFlow([
            {
              title: 'Next Follow-up',
              detail: typeLabel,
              lines: [`Scheduled for: ${formatFollowupDisplay(followupAt)}`],
            },
          ]);
          payload.note = flow ? `${noteText}\n\n${flow}` : noteText;
          payload.followupDate = formatFollowupDateOnly(followupAt);
          payload.followupAt = followupAt.toISOString();
          payload.followupType = followupType;
        }
        await addLeadNote(lead.id, payload, { accountId });
      }

      void queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      void queryClient.invalidateQueries({ queryKey: ['my-leads'] });
      onSaved?.();
      setSuccessOpen(true);
    } catch (err) {
      if (moved) {
        void queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
        onSaved?.();
      }
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const name = lead.buyerPersona?.fullName?.trim() || `Lead #${lead.id}`;
  const phone = lead.buyerPersona?.phone;
  const priorityMeta = rating ? PRIORITY_META[rating] : null;
  const priorityBadge = rating
    ? priorityBadgeColors(rating, isDark)
    : null;
  const meter = recorderState.metering;

  return (
    <>
    <Modal
      visible={visible && !successOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <HugeiconsIcon
                icon={UserIcon}
                size={20}
                color={colors.textSecondary}
                strokeWidth={1.5}
              />
            </View>
            <View style={styles.headerMain}>
              <Text style={styles.headerName} numberOfLines={1}>
                {name}
              </Text>
              {phone ? (
                <Text style={styles.headerPhone} numberOfLines={1}>
                  {formatPhoneDisplay(phone)}
                </Text>
              ) : null}
            </View>
            <View style={styles.priorityWrap}>
              <Pressable
                onPress={() => setPriorityOpen((o) => !o)}
                style={[
                  styles.priorityChip,
                  priorityBadge
                    ? {
                        backgroundColor: priorityBadge.backgroundColor,
                        borderColor: priorityBadge.borderColor,
                      }
                    : {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                ]}
              >
                {rating ? (
                  <HugeiconsIcon
                    icon={PRIORITY_ICON[rating]}
                    size={13}
                    color={priorityBadge!.color}
                    strokeWidth={1.5}
                  />
                ) : null}
                <Text
                  style={[
                    styles.priorityText,
                    { color: priorityBadge?.color ?? colors.textMuted },
                  ]}
                >
                  {priorityMeta?.label ?? 'Priority'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={priorityBadge?.color ?? colors.textMuted}
                />
              </Pressable>
              {priorityOpen ? (
                <View style={styles.priorityMenu}>
                  {PRIORITIES.map((p) => {
                    const opt = priorityBadgeColors(p, isDark);
                    const selected = p === rating;
                    return (
                      <Pressable
                        key={p}
                        style={[
                          styles.priorityOption,
                          selected && {
                            backgroundColor: opt.backgroundColor,
                            borderColor: opt.borderColor,
                          },
                        ]}
                        onPress={() => priorityMutation.mutate(p)}
                      >
                        <HugeiconsIcon
                          icon={PRIORITY_ICON[p]}
                          size={14}
                          color={opt.color}
                          strokeWidth={1.5}
                        />
                        <Text
                          style={{
                            color: opt.color,
                            fontWeight: '700',
                            fontSize: 12,
                            flex: 1,
                          }}
                        >
                          {PRIORITY_META[p].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {priorityOpen ? (
            <Pressable
              style={styles.priorityDismiss}
              onPress={() => setPriorityOpen(false)}
            />
          ) : null}

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {choices.length > 0 ? (
              <View style={styles.pillRow}>
                {choices.map((s) => {
                  const active = picked.includes(s.id);
                  const label = isVisitInterest(s)
                    ? 'Visit Interest'
                    : s.name;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => toggleStage(s)}
                      style={[styles.pill, active && styles.pillActive]}
                    >
                      <HugeiconsIcon
                        icon={iconForStageName(String(s.name ?? ''))}
                        size={16}
                        color={active ? colors.brand : colors.text}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.pillLabel,
                          active && { color: colors.brand },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {visitOptions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Visit type (optional)</Text>
                <View style={styles.pillRow}>
                  {[
                    ...visitOptions.map((o) => ({ value: o, label: o })),
                    ...(visitOptions.length > 1
                      ? [{ value: BOTH, label: 'Both' }]
                      : []),
                  ].map((o) => {
                    const active = visitPick === o.value;
                    return (
                      <Pressable
                        key={o.value}
                        onPress={() =>
                          setVisitPick((cur) =>
                            cur === o.value ? undefined : o.value
                          )
                        }
                        style={[styles.pill, active && styles.pillActive]}
                      >
                        <Text
                          style={[
                            styles.pillLabel,
                            active && { color: colors.brand },
                          ]}
                        >
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.noteBox}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a note…"
                placeholderTextColor={colors.textMuted}
                multiline
                value={note}
                onChangeText={setNote}
                maxLength={5000}
                textAlignVertical="top"
                keyboardAppearance={isDark ? 'dark' : 'light'}
                selectionColor={colors.brand}
              />

              {clips.length > 0 ? (
                <View style={styles.clipList}>
                  {clips.map((c) => {
                    const isActive = playingId === c.id;
                    const isPlaying = isActive && !paused;
                    return (
                      <View key={c.id} style={styles.clipChip}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPlaying ? 'Pause voice note' : 'Play voice note'
                          }
                          hitSlop={4}
                          onPress={() => void togglePlay(c)}
                          style={styles.playBtn}
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={14}
                            color={colors.white}
                            style={!isPlaying ? { marginLeft: 1 } : undefined}
                          />
                        </Pressable>
                        <ProgressWaveform
                          progress={isActive ? playProgress : 0}
                          brand={colors.brand}
                          onSeek={(f) => void seekClip(c, f)}
                        />
                        <Text style={styles.clipDuration}>
                          {formatDuration(
                            isActive ? playDisplaySec : c.durationSec
                          )}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove voice note"
                          hitSlop={6}
                          onPress={() => {
                            if (playingId === c.id) stopPlayback(true);
                            setClips((prev) =>
                              prev.filter((x) => x.id !== c.id)
                            );
                          }}
                          style={styles.clipRemove}
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              ) : null}

              {recording ? (
                <View style={styles.recordingBar}>
                  <View style={styles.recDot} />
                  <Text style={styles.recTimer}>
                    {formatDuration(recordSec)}
                  </Text>
                  <View style={styles.meterRow}>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const level =
                        typeof meter === 'number'
                          ? Math.max(0.15, Math.min(1, (meter + 50) / 50))
                          : 0.3 + (i % 3) * 0.15;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.meterBar,
                            { height: 6 + level * 14 },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Pressable
                    style={styles.stopRecBtn}
                    onPress={() => void stopRecording()}
                    accessibilityLabel="Stop recording"
                  >
                    <Text style={styles.stopRecText}>Stop</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.toolbar}>
                  <Pressable
                    style={styles.toolBtn}
                    onPress={() => void pickAudioFile()}
                    accessibilityLabel="Attach file"
                  >
                    <Ionicons
                      name="attach-outline"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    style={styles.toolBtn}
                    onPress={() => void startRecording()}
                    accessibilityLabel="Voice note"
                  >
                    <Ionicons
                      name="mic-outline"
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                  {channels.length > 0 ? (
                    <>
                      <View style={styles.toolbarDivider} />
                      {channels.map((c) => {
                        const active = channelId === c.id;
                        const icon =
                          CHANNEL_ICON[c.label] ?? 'chatbubble-outline';
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() =>
                              setChannelId((cur) =>
                                cur === c.id ? null : c.id
                              )
                            }
                            style={[
                              styles.channelChip,
                              active && styles.channelChipActive,
                            ]}
                          >
                            <Ionicons
                              name={icon}
                              size={14}
                              color={
                                active
                                  ? colors.brand
                                  : c.label === 'WhatsApp'
                                    ? '#25D366'
                                    : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.channelLabel,
                                active && { color: colors.brand },
                              ]}
                            >
                              {c.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </>
                  ) : null}
                </View>
              )}
            </View>

            {!terminal ? (
              <FollowupDateTimeField
                label={
                  followupRequired
                    ? 'Followup Date'
                    : 'Followup Date (optional)'
                }
                value={followupAt}
                onChange={setFollowupAt}
              />
            ) : null}
          </ScrollView>

          <Pressable
            disabled={!canSave}
            onPress={() => void handleSave()}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </Pressable>
        </View>
      </View>

    </Modal>

    <SuccessSheet
      open={successOpen}
      title="Successful"
      message="Your note has been added successfully."
      buttonLabel="Back to lead"
      onClose={() => {
        setSuccessOpen(false);
        onClose();
      }}
    />
    </>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      maxHeight: '92%',
      paddingTop: spacing.md,
      overflow: 'visible',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      zIndex: 30,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerMain: { flex: 1, minWidth: 0 },
    headerName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    headerPhone: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    priorityWrap: {
      position: 'relative',
      zIndex: 40,
    },
    priorityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    priorityText: { fontSize: 12, fontWeight: '700' },
    priorityMenu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 6,
      minWidth: 148,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 6,
      gap: 2,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.45 : 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
      zIndex: 50,
    },
    priorityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    priorityDismiss: {
      ...StyleSheet.absoluteFill,
      zIndex: 20,
    },
    closeBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xl,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.surfaceMuted : colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: colors.brand,
      backgroundColor: colors.primary50,
    },
    pillLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    section: { gap: 8 },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      fontWeight: '600',
    },
    noteBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.background : colors.surfaceMuted,
      overflow: 'hidden',
    },
    noteInput: {
      minHeight: 110,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      backgroundColor: 'transparent',
    },
    clipList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    clipChip: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minWidth: 220,
      maxWidth: '100%',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: 14,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 3,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    playBtn: {
      width: 32,
      height: 32,
      borderRadius: 999,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clipDuration: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    clipRemove: {
      position: 'absolute',
      right: -6,
      top: -6,
      width: 20,
      height: 20,
      borderRadius: 999,
      backgroundColor: CHIP_X_BG,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    toolbar: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: isDark ? colors.surfaceMuted : '#F2F4F7',
    },
    toolBtn: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
    },
    toolbarDivider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: colors.border,
      marginHorizontal: 6,
    },
    channelChip: {
      height: 28,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    channelChipActive: {
      borderColor: colors.brand,
      backgroundColor: colors.primary50,
    },
    channelLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    recordingBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.primary50,
    },
    recDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.danger,
    },
    recTimer: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    meterRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      height: 22,
    },
    meterBar: {
      width: 3,
      borderRadius: 2,
      backgroundColor: colors.brand,
      opacity: 0.85,
    },
    stopRecBtn: {
      backgroundColor: colors.brand,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    stopRecText: {
      color: colors.white,
      fontWeight: '700',
      fontSize: 12,
    },
    saveBtn: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.45 },
    saveText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
