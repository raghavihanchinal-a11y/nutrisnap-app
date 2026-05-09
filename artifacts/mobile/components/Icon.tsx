import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

const ICONS: Record<string, string> = {
  camera: "📷",
  "arrow-right": "→",
  "arrow-left": "←",
  "chevron-right": "›",
  "chevron-left": "‹",
  "chevron-up": "˄",
  "chevron-down": "˅",
  user: "◎",
  mail: "✉",
  phone: "✆",
  x: "✕",
  check: "✓",
  "rotate-ccw": "↺",
  image: "⊞",
  "edit-3": "✎",
  "log-out": "↩",
  "bar-chart-2": "▤",
  shield: "◈",
  zap: "⚡",
  "trash-2": "✗",
  plus: "+",
  minus: "−",
  settings: "⚙",
  home: "⌂",
  info: "ℹ",
  "alert-circle": "⚠",
  lock: "⊠",
  eye: "◉",
  "eye-off": "◎",
  star: "★",
  heart: "♥",
  share: "↗",
  download: "↓",
  upload: "↑",
  search: "⊕",
  menu: "≡",
  "more-horizontal": "•••",
  activity: "~",
  "trending-up": "↗",
  target: "◎",
  award: "★",
  fire: "🔥",
  leaf: "🌿",
  "pie-chart": "◑",
  grid: "⊞",
  list: "☰",
  clock: "○",
  calendar: "⊟",
  "flag": "⚑",
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function Icon({ name, size = 20, color = "#fff", style }: IconProps) {
  const glyph = ICONS[name] ?? "?";

  if (glyph.length > 2) {
    return (
      <Text
        style={[{ fontSize: size * 0.65, color, lineHeight: size, textAlign: "center" }, style]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {glyph}
      </Text>
    );
  }

  return (
    <Text
      style={[
        {
          fontSize: size,
          color,
          lineHeight: Platform.OS === "android" ? size * 1.2 : size,
          width: size,
          textAlign: "center",
          includeFontPadding: false,
        },
        style,
      ]}
      allowFontScaling={false}
    >
      {glyph}
    </Text>
  );
}
