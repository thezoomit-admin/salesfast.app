import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getErrorMessage } from '@/api/client';
import { NOTE_CHANNELS } from '@/features/leads/addNoteLogic';
import { uploadMediaFile } from '@/features/leads/mediaUpload';
import { radii, spacing, useTheme, type ThemeColors } from '@/theme';

/**
 * The Add Note note field — text, voice notes / audio files and the channel
 * chips — shared by Add Note and Mark as done. Note, clips and channel are
 * controlled; recording and playback live here.
 */

export type VoiceClip = {
  id: string;
  uri: string;
  name: string;
  durationSec: number;
  mimeType: string;
  /** Recorded levels (0…1), one per playback bar — the clip's real waveform. */
  waveform?: number[];
};

/** A channel chip in the composer toolbar (`label` is the short NOTE_CHANNELS name). */
export type ComposerChannel = { id: number; name: string; label: string };

/** The admin note channels the composer offers: Call, WhatsApp, In person. */
export function composerChannels(
  all: readonly { id: number; name: string }[] | undefined
): ComposerChannel[] {
  return NOTE_CHANNELS.flatMap(({ label, match }) => {
    const c = (all ?? []).find((ch) => match.test(String(ch.name ?? '').trim()));
    return c ? [{ id: c.id, name: c.name, label }] : [];
  });
}

/** Upload the clips and append them to the note as markdown links (web NoteComposer). */
export async function appendClipLinks(
  noteText: string,
  clips: readonly VoiceClip[],
  options: { accountId?: string } = {}
) {
  let text = noteText;
  for (const clip of clips) {
    const uploaded = await uploadMediaFile(clip.uri, clip.name, clip.mimeType, options);
    text = `${text}\n[${uploaded.name}](${uploaded.url})`.trim();
  }
  return text;
}

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

/** Live meter while recording: newest level on the right, older ones scroll left. */
const METER_BARS = 36;
const METER_TICK_MS = 80;
/** Playback position polls — the scrub thumb glides between them. */
const STATUS_INTERVAL_MS = 50;

/**
 * Some phones report no input level (metering stays at -160 dB) although the
 * recording itself is fine. Readings below this are "no level", and the live
 * meter then shows an activity pattern instead of real levels.
 */
const NO_LEVEL_DB = -100;

/** Stand-in level for phones without metering: a steady, speech-like ripple. */
function activityLevel(tick: number) {
  const wave = Math.sin(tick * 0.9) * 0.5 + Math.sin(tick * 2.3 + 1) * 0.3;
  return 0.25 + Math.abs(wave) * 0.45;
}

/** Recorder metering (dBFS, about -60…0) → 0…1, peaks emphasised like WhatsApp. */
function meterLevel(db: number | undefined) {
  if (typeof db !== 'number' || !Number.isFinite(db)) return 0;
  const norm = Math.min(1, Math.max(0, (db + 60) / 60));
  return norm ** 1.8;
}

/** A recording's level history squeezed into the playback bars (loudest per slice). */
function waveformOf(levels: readonly number[]) {
  if (!levels.length) return undefined;
  const n = PLAYBACK_BARS.length;
  return Array.from({ length: n }, (_, i) => {
    const from = Math.floor((i * levels.length) / n);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / n));
    return Math.max(...levels.slice(from, to));
  });
}

/** Wall clock for event handlers (kept out of component scope for the React compiler). */
const nowMs = () => Date.now();

const WAVE_UNFILLED = '#D0D5DD';
const CHIP_X_BG = '#15202C';

function ProgressWaveform({
  progress,
  playing,
  levels,
  brand,
  onSeek,
}: {
  progress: number;
  playing: boolean;
  /** The clip's recorded waveform; a fixed silhouette for picked files. */
  levels?: number[];
  brand: string;
  onSeek: (fraction: number) => void;
}) {
  const p = Math.min(1, Math.max(0, progress));
  const [width, setWidth] = useState(0);
  const [thumb] = useState(() => new Animated.Value(p));
  const heights = levels?.length ? levels.map((l) => 4 + l * 14) : PLAYBACK_BARS;

  // Glide to each new position over one status interval, so the thumb moves
  // continuously instead of jumping every update.
  useEffect(() => {
    Animated.timing(thumb, {
      toValue: p,
      duration: playing ? STATUS_INTERVAL_MS + 20 : 0,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [thumb, p, playing]);

  function seekAt(x: number) {
    if (!width) return;
    onSeek(Math.min(1, Math.max(0, x / width)));
  }

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel="Seek"
      style={waveStyles.progressTrack}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => seekAt(e.nativeEvent.locationX)}
      onResponderMove={(e) => seekAt(e.nativeEvent.locationX)}
    >
      {heights.map((h, i) => {
        const filled = i / heights.length < p;
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
      <Animated.View
        pointerEvents="none"
        style={[
          waveStyles.scrubThumb,
          {
            backgroundColor: brand,
            transform: [
              {
                translateX: thumb.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width],
                }),
              },
            ],
          },
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
    left: 0,
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

type Props = {
  note: string;
  onChangeNote: (note: string) => void;
  clips: VoiceClip[];
  onChangeClips: Dispatch<SetStateAction<VoiceClip[]>>;
  channels: ComposerChannel[];
  channelId: number | null;
  onChangeChannel: Dispatch<SetStateAction<number | null>>;
  /** Saving must wait while a voice note is being recorded. */
  onRecordingChange?: (recording: boolean) => void;
  placeholder?: string;
};

export function NoteComposer({
  note,
  onChangeNote,
  clips,
  onChangeClips,
  channels,
  channelId,
  onChangeChannel,
  onRecordingChange,
  placeholder = 'Write a note…',
}: Props) {
  const { colors, resolved } = useTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const recordingOptions = useMemo(
    () => ({
      ...RecordingPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
      numberOfChannels: 1,
    }),
    []
  );
  const recorder = useAudioRecorder(recordingOptions);

  const [recording, setRecordingState] = useState(false);
  const setRecording = (next: boolean) => {
    setRecordingState(next);
    onRecordingChange?.(next);
  };
  const recordStartedAt = useRef(0);
  const [recordSec, setRecordSec] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const levelHistory = useRef<number[]>([]);
  // Whether this phone reports real input levels during this recording.
  const hasLevels = useRef(false);
  const tickCount = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [playDisplaySec, setPlayDisplaySec] = useState(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const activeClipRef = useRef<VoiceClip | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (playTickRef.current) clearInterval(playTickRef.current);
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
    stopPlayTicks();
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

  function stopPlayTicks() {
    if (playTickRef.current) clearInterval(playTickRef.current);
    playTickRef.current = null;
  }

  /**
   * Poll the position while playing. Play / pause follow the user's taps only:
   * right after play() the player can still report "not playing", which must
   * not be read as a pause.
   */
  function playTick() {
    const player = playerRef.current;
    const clip = activeClipRef.current;
    if (!player || !clip) return;
    const meta = player.duration;
    const dur =
      clip.durationSec > 0
        ? clip.durationSec
        : Number.isFinite(meta) && meta > 0
          ? meta
          : 0;
    if (!dur) return;
    const cur = Math.min(player.currentTime || 0, dur);
    if (!player.playing && cur >= dur - 0.08) {
      stopPlayTicks();
      setPlayingId(null);
      setPaused(false);
      setPlayProgress(0);
      setPlayDisplaySec(clip.durationSec);
      return;
    }
    setPlayProgress(cur / dur);
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
    activeClipRef.current = clip;
    setPlayingId(clip.id);
    return playerRef.current;
  }

  async function togglePlay(clip: VoiceClip) {
    try {
      if (playingId === clip.id && !paused) {
        playerRef.current?.pause();
        stopPlayTicks();
        setPaused(true);
        return;
      }
      const player = await ensurePlayer(clip);
      player.play();
      setPaused(false);
      stopPlayTicks();
      playTickRef.current = setInterval(playTick, STATUS_INTERVAL_MS);
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

  function stopTicks() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }

  /** Timer and live waveform — every METER_TICK_MS. */
  function tick() {
    setRecordSec(Math.floor((nowMs() - recordStartedAt.current) / 1000));
    let db: number | undefined;
    try {
      db = recorder.getStatus().metering;
    } catch {
      db = undefined;
    }
    if (typeof db === 'number' && db > NO_LEVEL_DB) hasLevels.current = true;
    tickCount.current += 1;
    const level = hasLevels.current ? meterLevel(db) : activityLevel(tickCount.current);
    if (hasLevels.current) levelHistory.current.push(level);
    setLevels((prev) => [...prev.slice(1 - METER_BARS), level]);
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
      recordStartedAt.current = nowMs();
      levelHistory.current = [];
      hasLevels.current = false;
      tickCount.current = 0;
      setLevels([]);
      setRecordSec(0);
      recorder.record();
      stopTicks();
      tickRef.current = setInterval(tick, METER_TICK_MS);
      setRecording(true);
    } catch (err) {
      stopTicks();
      setRecording(false);
      const msg = getErrorMessage(err);
      Alert.alert(
        'Could not start recording',
        msg || 'Check microphone permission and try again.'
      );
    }
  }

  async function stopRecording() {
    stopTicks();
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const elapsed = Math.max(
        1,
        Math.round((nowMs() - recordStartedAt.current) / 1000)
      );
      setRecording(false);
      setRecordSec(0);
      if (!uri) return;
      onChangeClips((prev) => [
        ...prev,
        {
          id: `rec-${Date.now()}`,
          uri,
          name: `Voice note ${formatDuration(elapsed)}`,
          durationSec: elapsed,
          mimeType: 'audio/m4a',
          // Only a real level history is the clip's waveform.
          waveform: hasLevels.current ? waveformOf(levelHistory.current) : undefined,
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
      onChangeClips((prev) => [
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

  return (
    <View style={styles.noteBox}>
      <TextInput
        style={styles.noteInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        value={note}
        onChangeText={onChangeNote}
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
                  playing={isPlaying}
                  levels={c.waveform}
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
                    onChangeClips((prev) =>
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
            {Array.from({ length: METER_BARS }, (_, i) => {
              const level = levels[levels.length - METER_BARS + i] ?? 0;
              return (
                <View
                  key={i}
                  style={[styles.meterBar, { height: 3 + level * 19 }]}
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
                      onChangeChannel((cur) =>
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
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    noteBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      // White writing area over the gray toolbar.
      backgroundColor: colors.surface,
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
      justifyContent: 'flex-end',
      gap: 2,
      height: 22,
      overflow: 'hidden',
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
  });
}
