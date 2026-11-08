import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { memo, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ArrowDown01Icon,
  Calendar03Icon,
  HomeSolidIcon,
} from "@/components/icons/hugeicons";
import { HeroGradient } from "@/components/ui/HeroGradient";
import { SettingsIconButton } from "@/components/ui/SettingsIconButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { radii, spacing, useTheme } from "@/theme";

const SCENE = require("../../../assets/images/followups-hero.png");

/** Banner height / width (the pictures are about 1774 x 887). The hero is
 * this tall, so the whole picture shows. */
const SCENE_RATIO = 0.5;

/** How far the sheet below rides up over the scene. */
const SHEET_OVERLAP = 20;
/** How long the tapped summary stays before the pill folds back. */
const SUMMARY_MS = 4000;

/** Buttons stay white in dark mode, so their ink can't follow the theme. */
const INK = "#14184A";

type Props = {
  name: string;
  photo?: string | null;
  /** Today's numbers; null until the dashboard loads. */
  summary: string | null;
  onPickDate: () => void;
};

/** Same banner layout as the Notifications hero, with its own scene and copy. */
function FollowUpsHeroBase({ name, photo, summary, onPickDate }: Props) {
  const { resolved } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [heroHeight, setHeroHeight] = useState(0);
  const bannerHeight = width * SCENE_RATIO;

  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => setRevealed(false), SUMMARY_MS);
    return () => clearTimeout(id);
  }, [revealed]);

  return (
    <View
      onLayout={(e) => setHeroHeight(e.nativeEvent.layout.height)}
      style={[
        styles.root,
        { paddingTop: insets.top + 6, minHeight: bannerHeight },
      ]}
    >
      {/* Explicit size: on Android an absolute Image sized only by its insets
          draws nothing. The hero is the banner's height, so cover shows it
          whole; a very tall status bar trims the sides a little. */}
      <Image
        source={SCENE}
        fadeDuration={0}
        resizeMode="cover"
        style={[
          styles.scene,
          { width, height: Math.max(bannerHeight, heroHeight) },
        ]}
      />
      <HeroGradient />
      {resolved === "dark" ? <View style={styles.dim} /> : null}

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.navigate("/(tabs)/profile")}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <UserAvatar uri={photo} name={name} size={45} style={styles.avatar} />
        </Pressable>

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed && summary ? summary : "Real Estate CRM, today's summary"
            }
            disabled={!summary}
            onPress={() => setRevealed((open) => !open)}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          >
            <HugeiconsIcon icon={HomeSolidIcon} size={14} color={INK} />
            <Text style={styles.pillText} numberOfLines={1}>
              {revealed && summary ? summary : "Real Estate CRM"}
            </Text>
            {summary ? (
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                color={INK}
                strokeWidth={2.2}
                style={revealed ? styles.chevronOpen : undefined}
              />
            ) : null}
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pick a date"
          onPress={onPickDate}
          hitSlop={4}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={18}
            color={INK}
            strokeWidth={2}
          />
        </Pressable>
        <SettingsIconButton
          size={18}
          color={INK}
          hitSlop={4}
          style={styles.action}
        />
      </View>

      {/* Fixed height, matching the Notifications hero so the sheets line up. */}
      <View style={styles.copy}>
        <Text style={styles.headline} numberOfLines={1}>
          Follow-ups
        </Text>
        <Text style={styles.tagline}>
          Plan every touch &{"\n"}never miss a lead
        </Text>
      </View>
    </View>
  );
}

export const FollowUpsHero = memo(FollowUpsHeroBase);

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.lg,
    paddingBottom: SHEET_OVERLAP + 8,
    // The sheet is the next sibling, so this pulls it up over the scene.
    marginBottom: -SHEET_OVERLAP,
    overflow: "hidden",
  },
  scene: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 14, 38, 0.45)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  identity: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    gap: 3,
    marginLeft: 3,
  },
  name: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: "#FFFFFF",
  },
  pillText: {
    flexShrink: 1,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "600",
    color: INK,
  },
  chevronOpen: { transform: [{ rotate: "180deg" }] },
  action: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  copy: {
    height: 64,
    marginTop: 10,
    marginLeft: 8,
    gap: 2,
  },
  headline: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 40, 120, 0.45)",
    textShadowRadius: 4,
  },
  pressed: { opacity: 0.8 },
});
