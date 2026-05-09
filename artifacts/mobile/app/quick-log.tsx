import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/Icon";
import { useApp, type MealEntry } from "@/context/AppContext";
import { showInterstitialAd } from "@/components/AdBanner";
import { useSubscription } from "@/lib/revenuecat";

const C = {
  bg:      "#0a0a0a",
  card:    "#141414",
  border:  "#2a2a2a",
  primary: "#B8F84A",
  text:    "#ffffff",
  muted:   "#666",
  input:   "#1a1a1a",
};

function nutriScore(calories: number, protein: number): string {
  if (calories === 0) return "C";
  const ratio = protein / (calories / 100);
  if (ratio > 8) return "A";
  if (ratio > 5) return "B";
  if (ratio > 3) return "C";
  if (ratio > 1) return "D";
  return "E";
}

export default function QuickLogScreen() {
  const insets = useSafeAreaInsets();
  const { addMeal } = useApp();
  const { isSubscribed } = useSubscription();

  const [name, setName]         = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein]   = useState("");
  const [carbs, setCarbs]       = useState("");
  const [fat, setFat]           = useState("");
  const [fiber, setFiber]       = useState("");
  const [weight, setWeight]     = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  const isValid = name.trim().length > 0 && calories.length > 0 && parseFloat(calories) >= 0;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access to attach a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const cal = parseFloat(calories) || 0;
    const pro = parseFloat(protein)  || 0;
    const carb= parseFloat(carbs)    || 0;
    const f   = parseFloat(fat)      || 0;
    const fi  = parseFloat(fiber)    || 0;
    const wt  = parseFloat(weight)   || 0;

    const meal: MealEntry = {
      id:              Date.now().toString(),
      foodName:        name.trim(),
      estimatedWeight: wt,
      calories:        cal,
      protein:         pro,
      carbs:           carb,
      fat:             f,
      fiber:           fi,
      sodium:          0,
      nutriScore:      nutriScore(cal, pro),
      timestamp:       Date.now(),
      imageUri:        imageUri ?? undefined,
    };

    await addMeal(meal);
    setSaving(false);
    await showInterstitialAd(isSubscribed);
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Icon name="x" size={20} color="#888" />
          </Pressable>
          <Text style={styles.headerTitle}>Quick Log</Text>
          <Pressable
            style={[styles.saveBtn, { opacity: isValid ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!isValid || saving}
          >
            <Text style={styles.saveTxt}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo area */}
          <View style={styles.photoRow}>
            {imageUri ? (
              <Pressable onPress={pickImage} style={styles.photoPreview}>
                <Image source={{ uri: imageUri }} style={styles.photoImg} contentFit="cover" />
                <View style={styles.photoOverlay}>
                  <Icon name="edit-3" size={16} color="#fff" />
                </View>
              </Pressable>
            ) : (
              <View style={styles.photoBtns}>
                <Pressable style={styles.photoBtn} onPress={takePhoto}>
                  <Icon name="camera" size={20} color={C.primary} />
                  <Text style={styles.photoBtnTxt}>Take Photo</Text>
                </Pressable>
                <Pressable style={styles.photoBtn} onPress={pickImage}>
                  <Icon name="image" size={20} color={C.primary} />
                  <Text style={styles.photoBtnTxt}>Upload Photo</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Meal name */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEAL NAME *</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grilled Chicken Salad"
              placeholderTextColor="#444"
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Calories (hero field) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CALORIES *</Text>
            <View style={styles.calorieRow}>
              <TextInput
                style={styles.calorieInput}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor="#333"
                keyboardType="decimal-pad"
              />
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
          </View>

          {/* Macros grid */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MACROS (g)</Text>
            <View style={styles.macroGrid}>
              {[
                { label: "Protein",  value: protein,  set: setProtein,  color: "#fff"     },
                { label: "Carbs",    value: carbs,    set: setCarbs,    color: "#4A90D9"  },
                { label: "Fat",      value: fat,      set: setFat,      color: "#E05A5A"  },
                { label: "Fiber",    value: fiber,    set: setFiber,    color: "#888"     },
              ].map(({ label, value, set, color }) => (
                <View key={label} style={styles.macroCell}>
                  <Text style={[styles.macroCellLabel, { color }]}>{label}</Text>
                  <TextInput
                    style={styles.macroCellInput}
                    value={value}
                    onChangeText={set}
                    placeholder="0"
                    placeholderTextColor="#333"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.macroCellUnit}>g</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Optional weight */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SERVING WEIGHT (optional)</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />
              <Text style={styles.weightUnit}>g</Text>
            </View>
          </View>

          {/* Live preview */}
          {isValid && (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Preview</Text>
              <View style={styles.previewRow}>
                <View style={styles.previewScore}>
                  <Text style={styles.previewScoreTxt}>
                    {nutriScore(parseFloat(calories) || 0, parseFloat(protein) || 0)}
                  </Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{name}</Text>
                  <Text style={styles.previewMeta}>
                    {protein || 0}p · {carbs || 0}c · {fat || 0}f
                    {weight ? ` · ${weight}g` : ""}
                  </Text>
                </View>
                <Text style={styles.previewCal}>{calories} kcal</Text>
              </View>
            </View>
          )}

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.card,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: C.text },
  saveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 10,
  },
  saveTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#0a0a0a" },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  photoRow:    { marginBottom: 16 },
  photoBtns:   { flexDirection: "row", gap: 12 },
  photoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    justifyContent: "center",
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 18,
  },
  photoBtnTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.primary },
  photoPreview: {
    height: 160, borderRadius: 14, overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
  },
  photoImg:    { width: "100%", height: "100%" },
  photoOverlay:{
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8, padding: 6,
  },

  section:      { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontFamily: "Inter_500Medium", color: C.muted,
    letterSpacing: 0.7, marginBottom: 10,
  },

  nameInput: {
    backgroundColor: C.input, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 16, fontFamily: "Inter_400Regular", color: C.text,
  },

  calorieRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  calorieInput:{
    flex: 1, backgroundColor: C.input, borderRadius: 12,
    borderWidth: 1, borderColor: C.primary,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 32, fontFamily: "Inter_700Bold", color: C.primary,
    textAlign: "center",
  },
  calorieUnit: { fontSize: 16, fontFamily: "Inter_500Medium", color: C.muted },

  macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  macroCell: {
    width: "47%",
    backgroundColor: C.input, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  macroCellLabel:{ fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  macroCellInput:{
    fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, padding: 0,
  },
  macroCellUnit: { fontSize: 11, color: C.muted, fontFamily: "Inter_400Regular", marginTop: 2 },

  weightRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  weightInput:{
    flex: 1, backgroundColor: C.input, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 18, fontFamily: "Inter_400Regular", color: C.text,
  },
  weightUnit: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.muted },

  previewCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14, marginBottom: 16,
  },
  previewTitle:{ fontSize: 11, fontFamily: "Inter_500Medium", color: C.muted, marginBottom: 10 },
  previewRow:  { flexDirection: "row", alignItems: "center", gap: 10 },
  previewScore:{
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "#1a3a1a",
    justifyContent: "center", alignItems: "center",
  },
  previewScoreTxt: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.primary },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
  previewMeta: { fontSize: 11, color: C.muted, fontFamily: "Inter_400Regular", marginTop: 1 },
  previewCal:  { fontSize: 14, fontFamily: "Inter_700Bold", color: C.text },
});
