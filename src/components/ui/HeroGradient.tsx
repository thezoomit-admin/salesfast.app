import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/** Brand blue (700 → 500 → clear), deepest at the bottom-left corner. */
const COLORS = [
  "rgba(31, 87, 184, 0.75)",
  "rgba(58, 131, 247, 0.3)",
  "rgba(58, 131, 247, 0)",
] as const;
const LOCATIONS = [0, 0.55, 1] as const;

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
