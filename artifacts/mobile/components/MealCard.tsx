import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import type { MealEntry } from "@/context/AppContext";

const NUTRISCORE_COLORS: Record<string, string> = {
  A: "#1a9c3e",
  B: "#52a84c",
  C: "#f5b731",
  D: "#e0641b",
  E: "#e63b26",
};

interface MealCardProps {
  meal: MealEntry;
  onDelete: (id: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const scoreColor = NUTRISCORE_COLORS[meal.nutriScore] ?? "#888";

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Meal", `Remove "${meal.foodName}" from today's log?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onDelete(meal.id) },
    ]);
  };

  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      {meal.imageUri ? (
        <Image source={{ uri: meal.imageUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Icon name="image" size={20} color="#444" />
        </View>
      )}

      <View style={styles.middle}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{meal.foodName}</Text>
          <View style={[styles.scoreChip, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>{meal.nutriScore}</Text>
          </View>
        </View>

        <Text style={styles.meta}>{meal.estimatedWeight}g · {time}</Text>

        <View style={styles.macroRow}>
          <MacroBadge label="P" value={meal.protein} color="#fff" />
          <MacroBadge label="C" value={meal.carbs} color="#4A90D9" />
          <MacroBadge label="F" value={meal.fat} color="#E05A5A" />
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.calories}>{meal.calories}</Text>
        <Text style={styles.kcal}>kcal</Text>
        <Pressable onPress={handleDelete} hitSlop={10} style={styles.deleteBtn}>
          <Icon name="trash-2" size={14} color="#555" />
        </Pressable>
      </View>
    </View>
  );
}

function MacroBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.badge}>
      <Text style={[styles.badgeLbl, { color }]}>{label}</Text>
      <Text style={[styles.badgeVal, { color }]}>{value}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 10,
    overflow: "hidden",
  },
  thumb: {
    width: 80,
    height: 80,
  },
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#242424",
  },
  middle: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  scoreChip: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  meta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  macroRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#242424",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLbl: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  badgeVal: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  right: {
    alignItems: "center",
    paddingRight: 14,
    paddingLeft: 4,
    gap: 2,
  },
  calories: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  kcal: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  deleteBtn: {
    marginTop: 6,
  },
});
