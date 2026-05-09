import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { useSubscription } from "@/lib/revenuecat";
import { useApp } from "@/context/AppContext";

const LIME = "#B8F84A";
const BG   = "#0a0a0a";

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isSubscribed } = useSubscription();
  const { scanCount, FREE_SCAN_LIMIT } = useApp();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [error, setError] = useState("");

  const currentOffering = offerings?.current;
  const pkg = currentOffering?.availablePackages[0];
  const priceStr = pkg?.product.priceString ?? "₹99/month";
  const title    = pkg?.product.localizedTitle ?? "NutriSnap Premium";

  const handlePurchase = async () => {
    if (!pkg) return;
    setConfirmVisible(false);
    setError("");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await purchase(pkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      if (!e?.message?.includes("cancel")) {
        setError(e?.message ?? "Purchase failed. Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    setError("");
    try {
      await restore();
      if (isSubscribed) router.back();
    } catch (e: any) {
      setError(e?.message ?? "Restore failed.");
    }
  };

  const perks = [
    { icon: "zap",       text: "Unlimited food scans per day" },
    { icon: "bar-chart-2",text:"Detailed macro & calorie tracking" },
    { icon: "target",    text: "BMI, BMR & personalised targets" },
    { icon: "clock",     text: "Full 30-day history & charts" },
    { icon: "shield",    text: "All data stays on your device" },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <Icon name="x" size={20} color="#888" />
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.crownBadge}>
            <Text style={styles.crownEmoji}>⭐</Text>
          </View>
          <Text style={styles.headline}>You've reached your daily limit</Text>
          <Text style={styles.subline}>
            {scanCount}/{FREE_SCAN_LIMIT} free scans used today. Upgrade to scan unlimited meals.
          </Text>
        </Animated.View>

        {/* Perks */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.perksCard}>
          <Text style={styles.perksTitle}>Everything in Premium</Text>
          {perks.map((p) => (
            <View key={p.icon} style={styles.perkRow}>
              <View style={styles.perkIcon}>
                <Icon name={p.icon} size={16} color={LIME} />
              </View>
              <Text style={styles.perkTxt}>{p.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Price card */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.pricePlan}>{title}</Text>
              <Text style={styles.priceSub}>Cancel anytime</Text>
            </View>
            <Text style={styles.priceNum}>{priceStr}</Text>
          </View>
        </Animated.View>

        {error ? (
          <Text style={styles.errorTxt}>{error}</Text>
        ) : null}

        {/* CTA */}
        {!confirmVisible ? (
          <Pressable
            style={[styles.cta, (isPurchasing || !pkg) && styles.ctaDisabled]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setConfirmVisible(true);
            }}
            disabled={isPurchasing || !pkg}
          >
            {isPurchasing
              ? <ActivityIndicator color="#0a0a0a" />
              : <Text style={styles.ctaTxt}>Start Premium</Text>
            }
          </Pressable>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={styles.confirmBox}>
            <Text style={styles.confirmTxt}>
              You're in test mode. This will simulate a purchase of {priceStr}.
            </Text>
            <View style={styles.confirmBtns}>
              <Pressable style={styles.confirmCancel} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.confirmCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.confirmGo} onPress={handlePurchase} disabled={isPurchasing}>
                {isPurchasing ? <ActivityIndicator color="#0a0a0a" size="small" /> : <Text style={styles.confirmGoTxt}>Confirm</Text>}
              </Pressable>
            </View>
          </Animated.View>
        )}

        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={isRestoring}>
          <Text style={styles.restoreTxt}>
            {isRestoring ? "Restoring…" : "Restore purchase"}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          Subscription auto-renews until cancelled. Manage in App Store / Google Play settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  closeBtn: {
    position: "absolute", top: 56, right: 20, zIndex: 10,
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#1a1a1a",
    justifyContent: "center", alignItems: "center",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 80, alignItems: "stretch" },

  header:     { alignItems: "center", marginBottom: 28 },
  crownBadge: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: "rgba(184,248,74,0.1)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 16, borderWidth: 1, borderColor: "rgba(184,248,74,0.25)",
  },
  crownEmoji: { fontSize: 32 },
  headline:   { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subline:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center", lineHeight: 20 },

  perksCard: {
    backgroundColor: "#141414", borderRadius: 20,
    borderWidth: 1, borderColor: "#2a2a2a",
    padding: 20, marginBottom: 16,
  },
  perksTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 16 },
  perkRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  perkIcon:   {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(184,248,74,0.1)",
    justifyContent: "center", alignItems: "center",
  },
  perkTxt:    { fontSize: 14, fontFamily: "Inter_400Regular", color: "#ccc", flex: 1 },

  priceCard: {
    backgroundColor: "#141414", borderRadius: 16,
    borderWidth: 1.5, borderColor: LIME,
    padding: 18, marginBottom: 20,
  },
  priceRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pricePlan: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  priceSub:  { fontSize: 12, color: "#666", fontFamily: "Inter_400Regular", marginTop: 2 },
  priceNum:  { fontSize: 22, fontFamily: "Inter_700Bold", color: LIME },

  errorTxt: { fontSize: 13, color: "#ff4444", textAlign: "center", marginBottom: 12, fontFamily: "Inter_400Regular" },

  cta: {
    backgroundColor: LIME, borderRadius: 16,
    paddingVertical: 18, alignItems: "center", marginBottom: 12,
  },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt:      { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  confirmBox: {
    backgroundColor: "#1a1a1a", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a",
    padding: 16, marginBottom: 12,
  },
  confirmTxt:  { fontSize: 13, color: "#ccc", fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 14, lineHeight: 18 },
  confirmBtns: { flexDirection: "row", gap: 10 },
  confirmCancel: {
    flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "#2a2a2a",
    paddingVertical: 12, alignItems: "center",
  },
  confirmCancelTxt: { color: "#888", fontFamily: "Inter_500Medium" },
  confirmGo:        { flex: 1, borderRadius: 12, backgroundColor: LIME, paddingVertical: 12, alignItems: "center" },
  confirmGoTxt:     { color: "#0a0a0a", fontFamily: "Inter_700Bold" },

  restoreBtn: { alignItems: "center", marginBottom: 16 },
  restoreTxt: { fontSize: 13, color: "#666", fontFamily: "Inter_400Regular" },
  legal:      { fontSize: 11, color: "#444", textAlign: "center", lineHeight: 16, fontFamily: "Inter_400Regular" },
});
