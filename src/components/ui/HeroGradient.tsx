import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/** Primary blue (#3A83F7) fading out over the first 70% of the banner;
 * the top-right corner stays clear. */
const COLORS = [
  "rgba(58, 131, 247, 0.99)",
  "rgba(58, 131, 247, 0.9)",
  "rgba(58, 131, 247, 0.8)",
  "rgba(58, 131, 247, 0.6)",
  "rgba(58, 131, 247, 0.4)",
  "rgba(58, 131, 247, 0.25)",
  "rgba(58, 131, 247, 0.1)",
  "rgba(58, 131, 247, 0)",
] as const;
const LOCATIONS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7] as const;

/** Blue wash over a hero banner picture, from bottom-left to top-right. */
export function HeroGradient() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={COLORS}
      locations={LOCATIONS}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
