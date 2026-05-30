import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";

// ── AdMob IDs ────────────────────────────────────────────────────────────────
export const ADMOB_IDS = {
  APP_ID:       "ca-app-pub-4603657942439658~3235639248",
  BANNER:       "ca-app-pub-4603657942439658/4725874378",
  INTERSTITIAL: "ca-app-pub-4603657942439658/7841098667",
};

// ── Lazy-load the native SDK (not available on web or Expo Go) ───────────────
let MobileAds: any = null;
let InterstitialAd: any = null;
let AdEventType: any = null;
let BannerAd: any = null;
let BannerAdSize: any = null;

const isExpoGo = Platform.OS !== "web" && Constants.executionEnvironment === "storeClient";

try {
  if (!isExpoGo) {
    const mod = require("react-native-google-mobile-ads");
    MobileAds     = mod.default ?? mod.MobileAds ?? null;
    InterstitialAd = mod.InterstitialAd;
    AdEventType   = mod.AdEventType;
    BannerAd      = mod.BannerAd;
    BannerAdSize  = mod.BannerAdSize;
  }
} catch {
  // Native module unavailable — all ads run in stub mode
}

const adsAvailable = InterstitialAd !== null && Platform.OS !== "web";

// ── Interstitial: module-level singleton ─────────────────────────────────────
// We maintain one preloaded interstitial at a time.
// After each show (or failed show), we preload the next one.

let _interstitial: any = null;
let _interstitialLoaded = false;
let _interstitialLoading = false;

function _createInterstitial() {
  if (!adsAvailable) return;
  try {
    _interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });
    _interstitialLoaded = false;
    _interstitialLoading = true;

    _interstitial.addAdEventListener(AdEventType.LOADED, () => {
      _interstitialLoaded = true;
      _interstitialLoading = false;
    });
    _interstitial.addAdEventListener(AdEventType.ERROR, () => {
      _interstitialLoaded = false;
      _interstitialLoading = false;
    });
    _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // Preload the next one immediately after dismiss
      _createInterstitial();
    });

    _interstitial.load();
  } catch (e) {
    console.warn("[AdMob] Failed to create interstitial:", e);
  }
}

// Start preloading as soon as the module loads (native only)
if (adsAvailable) {
  _createInterstitial();
}

/**
 * Call once at app startup to initialize the AdMob SDK.
 * Safe to call on web or Expo Go — it no-ops in those environments.
 */
export function initializeMobileAds(): void {
  if (!MobileAds || Platform.OS === "web" || isExpoGo) return;
  try {
    MobileAds().initialize().catch(() => {});
  } catch {
    // SDK not available — ignore
  }
}

/**
 * Show a full-screen interstitial ad.
 * Resolves when the ad is closed (or immediately if unavailable/not loaded).
 * Pass `isSubscribed = true` to skip ads for premium users.
 */
export function showInterstitialAd(isSubscribed = false): Promise<void> {
  if (isSubscribed || !adsAvailable || !_interstitialLoaded || !_interstitial) {
    // Not loaded yet — preload for next time if we haven't started
    if (adsAvailable && !_interstitialLoading && !_interstitialLoaded) {
      _createInterstitial();
    }
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    try {
      // The CLOSED event fires on the singleton; resolve then
      const unsub = _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        unsub?.();
        resolve();
      });
      _interstitialLoaded = false;
      _interstitial.show();
    } catch (e) {
      console.warn("[AdMob] Failed to show interstitial:", e);
      resolve();
    }
  });
}

// ── Banner Ad component ───────────────────────────────────────────────────────

const MOCK_ADS = [
  { headline: "Track Every Bite",   body: "Lose weight faster with AI-powered nutrition.", cta: "Try Free",   color: "#1a3a1a", accent: "#B8F84A" },
  { headline: "MyFitnessPal Pro",   body: "Sync your workouts & meals in one place.",      cta: "Download",   color: "#1a1a3a", accent: "#7B8FF8" },
  { headline: "Healthy Meal Kits",  body: "Chef-prepared meals delivered to your door.",   cta: "Order Now",  color: "#3a1a1a", accent: "#F87B7B" },
];

interface AdBannerProps {
  style?: object;
}

export function AdBanner({ style }: AdBannerProps) {
  const [adIndex, setAdIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setAdIndex((i) => (i + 1) % MOCK_ADS.length);
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (Platform.OS === "web") return null;

  // Use real BannerAd on native non-Expo-Go builds
  if (BannerAd && BannerAdSize && !isExpoGo) {
    return (
      <View style={[styles.nativeBannerWrapper, style]}>
        <BannerAd
          unitId={ADMOB_IDS.BANNER}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    );
  }

  // Fallback: styled mock banner (web preview / Expo Go)
  const ad = MOCK_ADS[adIndex]!;
  return (
    <Pressable style={[styles.container, { backgroundColor: ad.color }, style]} onPress={() => {}}>
      <View style={styles.adLabel}>
        <Text style={styles.adLabelText}>Ad</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={{ fontSize: 18 }}>🥗</Text>
        </View>
        <View style={styles.text}>
          <Text style={styles.headline} numberOfLines={1}>{ad.headline}</Text>
          <Text style={styles.body}    numberOfLines={1}>{ad.body}</Text>
        </View>
        <View style={[styles.ctaButton, { backgroundColor: ad.accent }]}>
          <Text style={styles.ctaText}>{ad.cta}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nativeBannerWrapper: {
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 6,
  },
  container: {
    height: 60, borderRadius: 10,
    marginHorizontal: 16, marginVertical: 6,
    overflow: "hidden", borderWidth: 1, borderColor: "#2a2a2a",
  },
  adLabel: {
    position: "absolute", top: 4, left: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, zIndex: 1,
  },
  adLabelText: { fontSize: 8, color: "#aaa", fontWeight: "600", letterSpacing: 0.5 },
  content: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingTop: 6, gap: 10,
  },
  icon: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  text: { flex: 1 },
  headline: { fontSize: 12, fontWeight: "700", color: "#fff" },
  body:     { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  ctaButton: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  ctaText:   { fontSize: 11, fontWeight: "700", color: "#000" },
});
