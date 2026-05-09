import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type UserProfile, calculateBMI, bmiCategory } from "@/context/AppContext";

type Gender = "male" | "female" | "other";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; sub: string; emoji: string }[] = [
  { key: "sedentary",  label: "Sedentary",       sub: "Little to no exercise",    emoji: "🛋️" },
  { key: "light",      label: "Lightly Active",   sub: "1–3 days/week",            emoji: "🚶" },
  { key: "moderate",   label: "Moderately Active",sub: "3–5 days/week",            emoji: "🏃" },
  { key: "active",     label: "Very Active",      sub: "6–7 days/week",            emoji: "🏋️" },
  { key: "very_active",label: "Extra Active",     sub: "Athlete / physical job",   emoji: "⚡" },
];

const STEPS = ["Welcome", "Body Metrics", "Goal", "Activity"];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { saveProfile } = useApp();

  const [step, setStep]                   = useState(0);
  const [age, setAge]                     = useState("");
  const [gender, setGender]               = useState<Gender>("male");
  const [currentWeight, setCurrentWeight] = useState("");
  const [height, setHeight]               = useState("");
  const [targetWeight, setTargetWeight]   = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");

  const canNext = () => {
    if (step === 1) return age.length > 0 && currentWeight.length > 0 && height.length > 0;
    if (step === 2) return targetWeight.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const profile: UserProfile = {
      age:           parseInt(age, 10),
      gender,
      currentWeight: parseFloat(currentWeight),
      height:        parseFloat(height),
      targetWeight:  parseFloat(targetWeight),
      activityLevel,
      dailyCalorieGoal: 0,
    };
    await saveProfile(profile);
    router.replace("/(tabs)");
  };

  // live BMI preview while on metrics step
  const liveBMI =
    currentWeight && height
      ? calculateBMI(parseFloat(currentWeight), parseFloat(height))
      : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step progress dots */}
          <View style={styles.progress}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, {
                  backgroundColor: i <= step ? "#B8F84A" : "#2a2a2a",
                  width: i === step ? 28 : 8,
                }]}
              />
            ))}
          </View>

          <Animated.View
            key={step}
            entering={FadeInRight.duration(280)}
            exiting={FadeOutLeft.duration(180)}
            style={styles.stepContainer}
          >
            {step === 0 && <WelcomeStep />}
            {step === 1 && (
              <MetricsStep
                age={age} setAge={setAge}
                gender={gender} setGender={setGender}
                currentWeight={currentWeight} setCurrentWeight={setCurrentWeight}
                height={height} setHeight={setHeight}
                liveBMI={liveBMI}
              />
            )}
            {step === 2 && (
              <GoalStep targetWeight={targetWeight} setTargetWeight={setTargetWeight} />
            )}
            {step === 3 && (
              <ActivityStep selected={activityLevel} onSelect={setActivityLevel} />
            )}
          </Animated.View>

          <View style={styles.nav}>
            {step > 0 && (
              <Pressable
                style={styles.backBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep((s) => s - 1);
                }}
              >
                <Icon name="arrow-left" size={20} color="#888" />
              </Pressable>
            )}
            <Pressable
              style={[styles.nextBtn, { opacity: canNext() ? 1 : 0.4 }]}
              onPress={handleNext}
              disabled={!canNext()}
            >
              <Text style={styles.nextTxt}>
                {step === STEPS.length - 1 ? "Get Started" : "Continue"}
              </Text>
              <Icon name="arrow-right" size={18} color="#0a0a0a" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.welcome}>
      <View style={styles.logoCircle}>
        <Icon name="camera" size={38} color="#B8F84A" />
      </View>
      <Text style={styles.welcomeTitle}>NutriSnap</Text>
      <Text style={styles.welcomeSub}>
        Snap a photo of any food and get instant AI-powered nutrition analysis.
      </Text>
      <View style={styles.features}>
        {[
          { icon: "camera",      label: "AI food recognition from photos" },
          { icon: "bar-chart-2", label: "Calorie & macro tracking with BMI" },
          { icon: "target",      label: "Personalised daily nutrition goals" },
        ].map(({ icon, label }) => (
          <View key={icon} style={styles.featureRow}>
            <View style={styles.featureIconBox}>
              <Icon name={icon} size={16} color="#B8F84A" />
            </View>
            <Text style={styles.featureTxt}>{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function MetricsStep({
  age, setAge, gender, setGender,
  currentWeight, setCurrentWeight,
  height, setHeight,
  liveBMI,
}: {
  age: string; setAge: (v: string) => void;
  gender: Gender; setGender: (v: Gender) => void;
  currentWeight: string; setCurrentWeight: (v: string) => void;
  height: string; setHeight: (v: string) => void;
  liveBMI: number | null;
}) {
  const cat = liveBMI ? bmiCategory(liveBMI) : null;
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Body Metrics</Text>
      <Text style={styles.stepSub}>Used to calculate BMR, BMI & daily targets</Text>

      <Label text="Gender" />
      <View style={styles.genderRow}>
        {(["male", "female", "other"] as Gender[]).map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderTxt, gender === g && styles.genderTxtActive]}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Label text="Age" />
      <StyledInput value={age} onChangeText={setAge} placeholder="30" keyboardType="numeric" />

      <View style={styles.twoCol}>
        <View style={styles.twoColItem}>
          <Label text="Weight (kg)" />
          <StyledInput value={currentWeight} onChangeText={setCurrentWeight} placeholder="70" keyboardType="decimal-pad" />
        </View>
        <View style={styles.twoColItem}>
          <Label text="Height (cm)" />
          <StyledInput value={height} onChangeText={setHeight} placeholder="175" keyboardType="decimal-pad" />
        </View>
      </View>

      {/* Live BMI preview */}
      {liveBMI !== null && liveBMI > 0 && cat && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.bmiPreview, { borderColor: cat.color }]}>
          <View style={styles.bmiPreviewLeft}>
            <Text style={styles.bmiPreviewLabel}>Your BMI</Text>
            <Text style={[styles.bmiPreviewNum, { color: cat.color }]}>{liveBMI}</Text>
          </View>
          <View style={[styles.bmiCatBadge, { backgroundColor: cat.color + "20" }]}>
            <Text style={[styles.bmiCatTxt, { color: cat.color }]}>{cat.label}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function GoalStep({
  targetWeight, setTargetWeight,
}: { targetWeight: string; setTargetWeight: (v: string) => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Your Goal</Text>
      <Text style={styles.stepSub}>Where do you want to be?</Text>
      <Label text="Target Weight (kg)" />
      <StyledInput
        value={targetWeight}
        onChangeText={setTargetWeight}
        placeholder="65"
        keyboardType="decimal-pad"
      />
      <View style={styles.goalHintBox}>
        <Icon name="info" size={14} color="#555" />
        <Text style={styles.goalHintTxt}>
          Your daily calorie goal is set using the Mifflin-St Jeor equation with a 30/40/30 protein/carb/fat macro split.
        </Text>
      </View>
    </View>
  );
}

function ActivityStep({
  selected, onSelect,
}: { selected: ActivityLevel; onSelect: (v: ActivityLevel) => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>Activity Level</Text>
      <Text style={styles.stepSub}>How active are you on a typical week?</Text>
      {ACTIVITY_OPTIONS.map((opt) => (
        <Pressable
          key={opt.key}
          style={[styles.activityCard, selected === opt.key && styles.activityCardActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(opt.key);
          }}
        >
          <Text style={styles.activityEmoji}>{opt.emoji}</Text>
          <View style={styles.activityText}>
            <Text style={[styles.activityLabel, selected === opt.key && styles.activityLabelActive]}>
              {opt.label}
            </Text>
            <Text style={styles.activitySub}>{opt.sub}</Text>
          </View>
          <View style={[styles.activityIndicator, selected === opt.key && styles.activityIndicatorActive]}>
            {selected === opt.key && <Icon name="check" size={12} color="#0a0a0a" />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function StyledInput({
  value, onChangeText, placeholder, keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "numeric" | "decimal-pad";
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#444"
      keyboardType={keyboardType}
      returnKeyType="done"
    />
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0a0a0a" },
  flex:   { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, flexGrow: 1 },
  progress: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 40 },
  dot: { height: 8, borderRadius: 4 },
  stepContainer: { flex: 1, minHeight: 400 },

  welcome: { alignItems: "center", paddingTop: 16 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: "rgba(184,248,74,0.1)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(184,248,74,0.25)",
  },
  welcomeTitle:  { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 12 },
  welcomeSub:    { fontSize: 16, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center", lineHeight: 24, marginBottom: 40 },
  features:      { gap: 16, width: "100%" },
  featureRow:    { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIconBox:{
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(184,248,74,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  featureTxt: { color: "#ccc", fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },

  step:     { paddingTop: 8 },
  stepTitle:{ fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8 },
  stepSub:  { fontSize: 15, color: "#666", fontFamily: "Inter_400Regular", marginBottom: 28 },

  label: {
    fontSize: 12, fontFamily: "Inter_500Medium", color: "#888",
    marginBottom: 8, letterSpacing: 0.6, textTransform: "uppercase",
  },

  genderRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  genderBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#2a2a2a",
    alignItems: "center", backgroundColor: "#1a1a1a",
  },
  genderBtnActive: { backgroundColor: "#B8F84A", borderColor: "#B8F84A" },
  genderTxt:       { color: "#888", fontFamily: "Inter_500Medium", fontSize: 14 },
  genderTxtActive: { color: "#0a0a0a" },

  twoCol:     { flexDirection: "row", gap: 12 },
  twoColItem: { flex: 1 },

  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a",
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 18, fontFamily: "Inter_400Regular", color: "#fff",
    marginBottom: 20,
  },

  bmiPreview: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#111", borderRadius: 14, borderWidth: 1,
    padding: 16, marginTop: 4, marginBottom: 8,
  },
  bmiPreviewLeft:  { gap: 2 },
  bmiPreviewLabel: { fontSize: 11, color: "#666", fontFamily: "Inter_400Regular" },
  bmiPreviewNum:   { fontSize: 28, fontFamily: "Inter_700Bold" },
  bmiCatBadge:     { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  bmiCatTxt:       { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  goalHintBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#111", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#2a2a2a", marginTop: 8,
  },
  goalHintTxt: { flex: 1, fontSize: 12, color: "#666", fontFamily: "Inter_400Regular", lineHeight: 18 },

  activityCard: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 14, borderWidth: 1, borderColor: "#2a2a2a",
    marginBottom: 10, backgroundColor: "#1a1a1a", gap: 12,
  },
  activityCardActive:       { borderColor: "#B8F84A" },
  activityEmoji:            { fontSize: 22 },
  activityText:             { flex: 1 },
  activityLabel:            { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#888" },
  activityLabelActive:      { color: "#fff" },
  activitySub:              { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", marginTop: 2 },
  activityIndicator: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#2a2a2a", justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#444",
  },
  activityIndicatorActive: { backgroundColor: "#B8F84A", borderColor: "#B8F84A" },

  nav: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 32 },
  backBtn: {
    width: 52, height: 56, borderRadius: 14,
    borderWidth: 1, borderColor: "#2a2a2a",
    backgroundColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center",
  },
  nextBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    backgroundColor: "#B8F84A", paddingVertical: 18, borderRadius: 16,
  },
  nextTxt: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0a0a0a" },
});
