import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { saveUser, onboardingComplete } = useApp();

  const [name, setName]   = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Please enter your full name");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await saveUser({ name: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onboardingComplete) {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboarding");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <Text style={styles.appName}>NutriSnap</Text>
            <Text style={styles.tagline}>Track nutrition with a snap</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.card}>
            <Text style={styles.cardTitle}>Get Started</Text>
            <Text style={styles.cardSub}>Just your name — no passwords, no fuss.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Your Name</Text>
              <View style={[styles.fieldRow, error ? styles.fieldRowError : null]}>
                <Icon name="user" size={16} color="#555" />
                <TextInput
                  style={styles.fieldInput}
                  value={name}
                  onChangeText={(v) => { setName(v); setError(""); }}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor="#444"
                  autoCapitalize="words"
                  returnKeyType="go"
                  onSubmitEditing={handleStart}
                  autoFocus
                />
              </View>
              {error ? <Text style={styles.errorTxt}>{error}</Text> : null}
            </View>

            <Pressable
              style={[styles.startBtn, loading && styles.startBtnDisabled]}
              onPress={handleStart}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0a0a0a" />
              ) : (
                <>
                  <Text style={styles.startTxt}>Start Tracking</Text>
                  <Icon name="arrow-right" size={18} color="#0a0a0a" />
                </>
              )}
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.features}>
            <FeatureRow icon="camera"      text="AI food photo analysis (Claude)" />
            <FeatureRow icon="bar-chart-2" text="BMI, BMR & personalised macro goals" />
            <FeatureRow icon="star"        text="Unlimited scans with Premium (₹99/mo)" />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={14} color="#B8F84A" />
      </View>
      <Text style={styles.featureTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0a0a0a" },
  flex:   { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 32 },

  hero: { alignItems: "center", marginBottom: 36 },
  appIcon: {
    width: 96, height: 96, borderRadius: 22,
    marginBottom: 16,
  },
  appName: { fontSize: 34, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 6 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#666" },

  card: {
    backgroundColor: "#141414", borderRadius: 24,
    padding: 24, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 28,
  },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 4 },
  cardSub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 24 },

  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12, fontFamily: "Inter_500Medium", color: "#888",
    marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase",
  },
  fieldRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#1a1a1a", borderRadius: 14,
    borderWidth: 1, borderColor: "#2a2a2a",
    paddingHorizontal: 16, height: 56, gap: 12,
  },
  fieldRowError: { borderColor: "#ff4444" },
  fieldInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: "#fff" },
  errorTxt: {
    fontSize: 12, color: "#ff4444",
    fontFamily: "Inter_400Regular", marginTop: 6,
  },

  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#B8F84A",
    borderRadius: 16, paddingVertical: 18,
  },
  startBtnDisabled: { opacity: 0.6 },
  startTxt: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  features: { gap: 14, paddingHorizontal: 4 },
  featureRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(184,248,74,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  featureTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888", flex: 1 },
});
