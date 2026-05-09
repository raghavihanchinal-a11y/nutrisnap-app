import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const NUTRISCORE_COLORS: Record<string, string> = {
  A: "#1a9c3e",
  B: "#52a84c",
  C: "#f5b731",
  D: "#e0641b",
  E: "#e63b26",
};

export interface NutritionData {
  foodName: string;
  estimatedWeight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  nutriScore: string;
  confidence: string;
}

interface NutritionResultsProps {
  data: NutritionData;
  onSave: () => void;
  onRetake: () => void;
}

export function NutritionResults({ data, onSave, onRetake }: NutritionResultsProps) {
  const score = data.nutriScore ?? "C";
  const scoreColor = NUTRISCORE_COLORS[score] ?? "#888";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(350)}>
        <View style={styles.foodHeader}>
          <Text style={styles.foodName}>{data.foodName}</Text>
          <Text style={styles.weight}>{data.estimatedWeight}g estimated</Text>
        </View>

        <View style={styles.calorieRow}>
          <View style={styles.calorieBlock}>
            <Text style={styles.calorieNum}>{data.calories}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
          <View style={styles.macroGrid}>
            <MacroStat label="Protein" value={data.protein} unit="g" color="#fff" />
            <MacroStat label="Carbs" value={data.carbs} unit="g" color="#4A90D9" />
            <MacroStat label="Fat" value={data.fat} unit="g" color="#E05A5A" />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.microRow}>
          <MicroStat label="Fiber" value={`${data.fiber}g`} />
          <MicroStat label="Sodium" value={`${data.sodium}mg`} />
        </View>

        <View style={styles.divider} />

        <View style={styles.nutriSection}>
          <Text style={styles.nutriTitle}>NutriScore</Text>
          <View style={styles.gradeRow}>
            {["A", "B", "C", "D", "E"].map((g) => (
              <View
                key={g}
                style={[
                  styles.gradeChip,
                  { backgroundColor: NUTRISCORE_COLORS[g] },
                  score === g && styles.activeGradeChip,
                ]}
              >
                <Text style={[styles.gradeText, score === g && styles.activeGradeText]}>{g}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.nutriSubtitle, { color: scoreColor }]}>
            {getScoreDescription(score, data)}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(350).delay(150)} style={styles.actions}>
        <Pressable
          style={styles.retakeBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRetake();
          }}
        >
          <Icon name="camera" size={18} color="#fff" />
          <Text style={styles.retakeTxt}>Retake</Text>
        </Pressable>
        <Pressable
          style={styles.saveBtn}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSave();
          }}
        >
          <Icon name="check" size={18} color="#0a0a0a" />
          <Text style={styles.saveTxt}>Log Meal</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

function MacroStat({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroStat}>
      <Text style={[styles.macroValue, { color }]}>{value}{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.microStat}>
      <Text style={styles.microValue}>{value}</Text>
      <Text style={styles.microLabel}>{label}</Text>
    </View>
  );
}

function getScoreDescription(score: string, data: NutritionData): string {
  const msg: Record<string, string> = {
    A: "Excellent nutritional quality",
    B: "Good nutritional quality",
    C: "Average nutritional quality",
    D: "Poor nutritional quality – consume in moderation",
    E: "Very poor nutritional quality – consume rarely",
  };
  return msg[score] ?? "Nutritional quality assessed";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20, paddingBottom: 40 },
  foodHeader: { marginBottom: 20 },
  foodName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  weight: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 20,
    marginBottom: 4,
    gap: 20,
  },
  calorieBlock: {
    alignItems: "flex-start",
  },
  calorieNum: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#B8F84A",
    lineHeight: 52,
  },
  calorieUnit: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  macroGrid: {
    flex: 1,
    gap: 12,
  },
  macroStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  macroLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  divider: {
    height: 1,
    backgroundColor: "#1a1a1a",
    marginVertical: 16,
  },
  microRow: {
    flexDirection: "row",
    gap: 12,
  },
  microStat: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    alignItems: "center",
  },
  microValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  microLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666",
    marginTop: 2,
  },
  nutriSection: { marginBottom: 24 },
  nutriTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginBottom: 12,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  gradeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    opacity: 0.35,
  },
  activeGradeChip: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  gradeText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  activeGradeText: {
    fontSize: 18,
  },
  nutriSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  retakeTxt: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#B8F84A",
  },
  saveTxt: {
    color: "#0a0a0a",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
