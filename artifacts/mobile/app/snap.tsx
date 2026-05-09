import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import type { MealEntry } from "@/context/AppContext";
import { showInterstitialAd } from "@/components/AdBanner";
import { useColors } from "@/hooks/useColors";
import { NutritionResults, type NutritionData } from "@/components/NutritionResults";
import { useSubscription } from "@/lib/revenuecat";

type Stage = "camera" | "preview" | "analyzing" | "results";

export default function SnapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMeal, canScan, incrementScanCount, scanCount, FREE_SCAN_LIMIT } = useApp();
  const { isSubscribed } = useSubscription();

  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const scanAllowed = canScan(isSubscribed);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    if (!scanAllowed) { router.push("/paywall"); return; }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo) {
        setCapturedUri(photo.uri);
        setStage("preview");
      }
    } catch (_) {
      setError("Failed to capture photo. Please try again.");
    }
  }, [scanAllowed]);

  const pickFromGallery = useCallback(async () => {
    if (!scanAllowed) { router.push("/paywall"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
      setStage("preview");
    }
  }, [scanAllowed]);

  const analyzeImage = useCallback(async () => {
    if (!capturedUri) return;
    if (!canScan(isSubscribed)) { router.push("/paywall"); return; }

    setStage("analyzing");
    setError(null);
    try {
      let base64: string;

      if (Platform.OS === "web") {
        // On web, try manipulation — fall back to fetching original as base64
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            capturedUri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
          );
          const uri = manipulated.uri;
          if (uri.startsWith("data:")) {
            base64 = uri.split(",")[1] ?? "";
          } else {
            const resp = await fetch(uri);
            const blob = await resp.blob();
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // Fallback: fetch original URI as base64
          const resp = await fetch(capturedUri);
          const blob = await resp.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        // Native: resize first, then read as base64
        const manipulated = await ImageManipulator.manipulateAsync(
          capturedUri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
        );
        base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
          encoding: "base64" as any,
        });
      }

      if (!base64 || base64.length < 100) {
        throw new Error("Could not read image data. Try picking from gallery.");
      }

      const domain = process.env["EXPO_PUBLIC_DOMAIN"];
      const apiUrl = domain ? `https://${domain}/api/analyze-food` : "/api/analyze-food";

      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: "image/jpeg" }),
      });

      if (!apiResponse.ok) {
        const text = await apiResponse.text();
        throw new Error(`Server error (${apiResponse.status}). Please retry.`);
      }

      const data = (await apiResponse.json()) as NutritionData;
      await incrementScanCount();
      setNutritionData(data);
      setStage("results");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.log("Analysis error:", e);
      const msg: string = e?.message ?? "";
      if (msg.includes("Could not process image") || msg.includes("read image")) {
        setError("Image too large or unreadable. Try picking a clearer photo from gallery.");
      } else {
        setError(msg || "Analysis failed. Please try again.");
      }
      setStage("preview");
    }
  }, [capturedUri, canScan, isSubscribed, incrementScanCount]);

  const handleSave = useCallback(async () => {
    if (!nutritionData) return;
    const meal: MealEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      foodName: nutritionData.foodName,
      estimatedWeight: nutritionData.estimatedWeight,
      calories: nutritionData.calories,
      protein: nutritionData.protein,
      carbs: nutritionData.carbs,
      fat: nutritionData.fat,
      fiber: nutritionData.fiber,
      sodium: nutritionData.sodium,
      nutriScore: nutritionData.nutriScore,
      timestamp: Date.now(),
      imageUri: capturedUri ?? undefined,
    };
    await addMeal(meal);
    await showInterstitialAd(isSubscribed);
    router.replace("/(tabs)");
  }, [nutritionData, capturedUri, addMeal]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setNutritionData(null);
    setError(null);
    setStage("camera");
  }, []);

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: "#000" }]}>
        <ActivityIndicator color="#B8F84A" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionScreen, { backgroundColor: "#000", paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.permIcon}>
          <Icon name="camera" size={36} color="#B8F84A" />
        </View>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>NutriSnap needs camera access to analyze your food</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnTxt}>Enable Camera</Text>
        </Pressable>
        <Pressable style={styles.galleryFallback} onPress={pickFromGallery}>
          <Text style={styles.galleryFallbackTxt}>Or pick from gallery</Text>
        </Pressable>
      </View>
    );
  }

  if (stage === "results" && nutritionData) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <View style={[styles.resultsHeader, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={handleRetake} style={styles.headerIconBtn}>
            <Icon name="x" size={20} color="#ffffff" />
          </Pressable>
          <Text style={styles.resultsTitle}>Nutrition Analysis</Text>
          <View style={{ width: 36 }} />
        </View>
        <NutritionResults data={nutritionData} onSave={handleSave} onRetake={handleRetake} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Scan limit banner for free users */}
      {!isSubscribed && stage === "camera" && (
        <View style={[styles.scanBanner, { top: insets.top + 60 }]}>
          <Text style={styles.scanBannerTxt}>
            {scanCount}/{FREE_SCAN_LIMIT} free scans used today
          </Text>
          {!scanAllowed && (
            <Pressable onPress={() => router.push("/paywall")} style={styles.upgradePill}>
              <Text style={styles.upgradePillTxt}>Upgrade</Text>
            </Pressable>
          )}
        </View>
      )}

      {stage === "camera" && (
        <View style={{ flex: 1 }}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={[StyleSheet.absoluteFill, styles.cameraOverlay]}>
            <View style={[styles.cameraTop, { paddingTop: insets.top + 10 }]}>
              <Pressable onPress={() => router.back()} style={styles.overlayIconBtn}>
                <Icon name="arrow-left" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.cameraTitle}>Snap & Log</Text>
              <Pressable onPress={pickFromGallery} style={styles.overlayIconBtn}>
                <Icon name="image" size={22} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.frameGuide}>
              <View style={styles.gridLine1} />
              <View style={styles.gridLine2} />
              <View style={styles.gridLine3} />
              <View style={styles.gridLine4} />
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
            </View>

            <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.cameraHint}>
                {scanAllowed ? "Center food in frame" : "Daily limit reached — upgrade for unlimited scans"}
              </Text>
              <Pressable
                onPress={scanAllowed ? takePicture : () => router.push("/paywall")}
                style={[styles.shutterOuter, !scanAllowed && styles.shutterBlocked]}
              >
                <View style={[styles.shutterInner, !scanAllowed && styles.shutterInnerBlocked]}>
                  {!scanAllowed && <Icon name="lock" size={22} color="#0a0a0a" />}
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {(stage === "preview" || stage === "analyzing") && capturedUri && (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: capturedUri }} style={styles.camera} />
          <View style={StyleSheet.absoluteFill}>
            {stage === "analyzing" && (
              <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.analyzeOverlay}>
                <Animated.View entering={ZoomIn.duration(400)}>
                  <View style={styles.analyzeBox}>
                    <ActivityIndicator size="large" color="#B8F84A" />
                    <Text style={styles.analyzeTxt}>Finding micro-nutrients...</Text>
                  </View>
                </Animated.View>
              </Animated.View>
            )}
            {stage === "preview" && (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.previewActions, { paddingBottom: insets.bottom + 24 }]}>
                {error && <Text style={styles.errorTxt}>{error}</Text>}
                <View style={styles.previewBtns}>
                  <Pressable style={styles.previewRetake} onPress={handleRetake}>
                    <Icon name="rotate-ccw" size={18} color="#fff" />
                    <Text style={styles.previewBtnTxt}>Retake</Text>
                  </Pressable>
                  <Pressable style={styles.previewContinue} onPress={analyzeImage}>
                    <Text style={styles.previewContTxt}>Analyze</Text>
                    <Icon name="arrow-right" size={18} color="#0a0a0a" />
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function CornerBracket({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop  = position.startsWith("t");
  const isLeft = position.endsWith("l");
  return (
    <View style={[
      styles.corner,
      isTop ? { top: 0 } : { bottom: 0 },
      isLeft ? { left: 0 } : { right: 0 },
      {
        borderTopWidth:         isTop  ? 3 : 0,
        borderBottomWidth:      isTop  ? 0 : 3,
        borderLeftWidth:        isLeft ? 3 : 0,
        borderRightWidth:       isLeft ? 0 : 3,
        borderTopLeftRadius:    position === "tl" ? 8 : 0,
        borderTopRightRadius:   position === "tr" ? 8 : 0,
        borderBottomLeftRadius: position === "bl" ? 8 : 0,
        borderBottomRightRadius:position === "br" ? 8 : 0,
      },
    ]} />
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  camera: { flex: 1 },

  scanBanner: {
    position: "absolute",
    left: 20, right: 20,
    zIndex: 50,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(184,248,74,0.2)",
  },
  scanBannerTxt: { fontSize: 12, color: "#ccc", fontFamily: "Inter_400Regular" },
  upgradePill: {
    backgroundColor: "#B8F84A", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  upgradePillTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  cameraOverlay: { justifyContent: "space-between" },
  cameraTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20,
  },
  cameraTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  overlayIconBtn: {
    width: 44, height: 44, justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 22,
  },
  frameGuide: { position: "absolute", top: "20%", left: "5%", right: "5%", bottom: "22%" },
  gridLine1:  { position: "absolute", left: "33%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  gridLine2:  { position: "absolute", left: "66%", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  gridLine3:  { position: "absolute", left: 0, right: 0, top: "33%", height: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  gridLine4:  { position: "absolute", left: 0, right: 0, top: "66%", height: 1, backgroundColor: "rgba(255,255,255,0.25)" },
  corner: { position: "absolute", width: 30, height: 30, borderColor: "#B8F84A" },

  cameraBottom: { alignItems: "center", gap: 20, paddingTop: 20 },
  cameraHint: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  shutterOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 3, borderColor: "#fff",
  },
  shutterBlocked: { borderColor: "#B8F84A", backgroundColor: "rgba(184,248,74,0.15)" },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" },
  shutterInnerBlocked: {
    backgroundColor: "#B8F84A",
    justifyContent: "center", alignItems: "center",
  },

  analyzeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center", alignItems: "center",
  },
  analyzeBox: {
    backgroundColor: "rgba(10,10,10,0.96)", borderRadius: 20,
    padding: 32, alignItems: "center", gap: 16,
    borderWidth: 1, borderColor: "rgba(184,248,74,0.3)",
  },
  analyzeTxt: { color: "#fff", fontSize: 16, fontFamily: "Inter_500Medium" },

  previewActions: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, gap: 12 },
  errorTxt: {
    color: "#ff4444", textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular",
    backgroundColor: "rgba(255,68,68,0.15)", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
  },
  previewBtns: { flexDirection: "row", gap: 12 },
  previewRetake: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  previewBtnTxt:    { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  previewContinue:  {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: "#B8F84A",
  },
  previewContTxt:   { color: "#0a0a0a", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  permissionScreen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  permIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: "rgba(184,248,74,0.12)",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(184,248,74,0.3)",
  },
  permTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  permSub:   { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center", lineHeight: 22 },
  permBtn:   { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, backgroundColor: "#B8F84A", marginTop: 8 },
  permBtnTxt: { color: "#0a0a0a", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  galleryFallback:    { paddingVertical: 8 },
  galleryFallbackTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888" },

  resultsHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#2a2a2a", backgroundColor: "#0a0a0a",
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center",
  },
  resultsTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
