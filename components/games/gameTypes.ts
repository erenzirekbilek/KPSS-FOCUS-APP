// components/games/gameTypes.ts
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const LightMode = {
  bg: "#f0f7ff",
  bgSecondary: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#555",
  border: "#bfdbfe",
  accent: "#2563eb",
  gridBg: "#dbeafe",
  cellBorder: "#bfdbfe",
  pathColor: "#3b82f6",
  pathDark: "#1d4ed8",
  numberBg: "#1e3a8a",
  numberText: "#ffffff",
  cardShadow: "#2563eb22",
};

export const DarkMode = {
  bg: "#000000",
  bgSecondary: "#0a0f1e",
  text: "#ffffff",
  textSecondary: "#888",
  border: "#1e3a5f",
  accent: "#60a5fa",
  gridBg: "#070d1a",
  cellBorder: "#1e3a5f",
  pathColor: "#3b82f6",
  pathDark: "#1d4ed8",
  numberBg: "#1e3a8a",
  numberText: "#ffffff",
  cardShadow: "#60a5fa22",
};

export type Colors = typeof LightMode;
export type GameId = "matching" | "reaction" | "candy";

export interface GameProps {
  colors: Colors;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

export const GAMES: {
  id: GameId;
  label: string;
  desc: string;
  color: string;
  emoji: string;
  image?: ReturnType<typeof require>;
}[] = [
  {
    id: "matching",
    label: "Kelime Eşleştirme",
    desc: "...",
    color: "#00E5FF",
    emoji: "🧠",
    image: require("../../assets/images/matching.png"),
  },
  {
    id: "reaction",
    label: "Reaksiyon",
    desc: "...",
    color: "#FF6B6B",
    emoji: "⚡",
    image: require("../../assets/images/reaction.png"),
  },
  {
    id: "candy",
    label: "Candy Game",
    desc: "...",
    color: "#A78BFA",
    emoji: "🍬",
    image: require("../../assets/images/candy.png"),
  },
];
