import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { useApp, bmiCategory } from "@/context/AppContext";
import { ProgressRing } from "@/components/ProgressRing";
import { MealCard } from "@/components/MealCard";
import { AdBanner } from "@/components/AdBanner";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { todayMeals, macroGoals, getTodayConsumed, removeMeal, user, logout, profile, bmi } = useApp();
  const consumed  = getTodayConsumed();
  const remaining = Math.max(macroGoals.calories - consumed.calories, 0);

  const [profileOpen, setProfileOpen] = useState(false);
  const [fabOpen, setFabOpen]         = useState(false);

  const topPadding    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  const rings = [
    { label: "Calories", key: "calories" as const, color: "#B8F84A", unit: "kcal" },
    { label: "Protein",  key: "protein"  as const, color: "#ffffff", unit: "g" },
    { label: "Carbs",    key: "carbs"    as const, color: "#4A90D9", unit: "g" },
    { label: "Fat",      key: "fat"      as const, color: "#E05A5A", unit: "g" },
  ];

  const remainingMacros = [
    { label: "Protein", key: "protein" as const, color: "#fff",     unit: "g" },
    { label: "Carbs",   key: "carbs"   as const, color: "#4A90D9",  unit: "g" },
    { label: "Fat",     key: "fat"     as const, color: "#E05A5A",  unit: "g" },
  ];

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive", onPress: async () => {
          setProfileOpen(false);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const bmiCat = bmi ? bmiCategory(bmi) : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: topPadding + 16,
          paddingBottom: bottomPadding + 16,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </Text>
            <Text style={styles.headerTitle}>
              {user?.name ? `Hi, ${user.name.split(" ")[0]} 👋` : "Today"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.remainBadge}>
              <Text style={styles.remainBadgeNum}>{remaining}</Text>
              <Text style={styles.remainBadgeLabel}>kcal left</Text>
            </View>
            <Pressable style={styles.avatarBtn} onPress={() => setProfileOpen(true)}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── BMI card (when profile has height) ── */}
        {bmi !== null && bmiCat && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.bmiCard}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiCardLabel}>BMI</Text>
              <Text style={[styles.bmiCardNum, { color: bmiCat.color }]}>{bmi}</Text>
            </View>
            <View style={styles.bmiMiddle}>
              <View style={[styles.bmiCatPill, { backgroundColor: bmiCat.color + "20", borderColor: bmiCat.color + "60" }]}>
                <Text style={[styles.bmiCatTxt, { color: bmiCat.color }]}>{bmiCat.label}</Text>
              </View>
              {profile && (
                <Text style={styles.bmiStats}>
                  {profile.currentWeight} kg · {profile.height} cm
                </Text>
              )}
            </View>
            <Pressable
              style={styles.bmiEditBtn}
              onPress={() => { setProfileOpen(false); router.push("/onboarding"); }}
            >
              <Icon name="edit-3" size={15} color="#555" />
            </Pressable>
          </Animated.View>
        )}

        {/* ── Today's macro rings ── */}
        <View style={styles.todayCard}>
          <View style={styles.todayCardHeader}>
            <Text style={styles.todayCardTitle}>Today's counts</Text>
            <Text style={styles.todayCardSub}>
              {macroGoals.calories} kcal goal
            </Text>
          </View>
          <View style={styles.ringRow}>
            {rings.map((r) => (
              <ProgressRing
                key={r.label}
                size={78}
                strokeWidth={7}
                progress={macroGoals[r.key] > 0 ? Math.min(consumed[r.key] / macroGoals[r.key], 1) : 0}
                color={r.color}
                label={r.label}
                value={consumed[r.key].toString()}
                unit={r.unit}
              />
            ))}
          </View>
          <View style={styles.goalRow}>
            {rings.map((r) => (
              <View key={r.label} style={styles.goalItem}>
                <View style={[styles.goalDot, { backgroundColor: r.color }]} />
                <Text style={styles.goalText}>/{macroGoals[r.key]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Remaining macros bar ── */}
        <View style={styles.remainingCard}>
          <Text style={styles.remainingTitle}>Remaining</Text>
          <View style={styles.remainingRow}>
            {remainingMacros.map((m) => {
              const rem = Math.max(macroGoals[m.key] - consumed[m.key], 0);
              const pct = macroGoals[m.key] > 0
                ? Math.max(1 - consumed[m.key] / macroGoals[m.key], 0)
                : 0;
              return (
                <View key={m.label} style={styles.remainItem}>
                  <View style={styles.remainBar}>
                    <View style={[styles.remainBarFill, {
                      height: `${Math.round(pct * 100)}%` as any,
                      backgroundColor: m.color,
                    }]} />
                  </View>
                  <Text style={[styles.remainNum, { color: m.color }]}>{rem}</Text>
                  <Text style={styles.remainLabel}>{m.label}</Text>
                  <Text style={styles.remainUnit}>{m.unit}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <AdBanner style={{ marginHorizontal: 0, marginBottom: 16 }} />

        {/* ── Meals list ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.mealCount}>{todayMeals.length} meals</Text>
        </View>

        {todayMeals.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="camera" size={32} color="#333" />
            <Text style={styles.emptyTitle}>No meals logged yet</Text>
            <Text style={styles.emptySub}>
              Tap the camera button to snap or manually log your first meal
            </Text>
          </View>
        ) : (
          todayMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onDelete={removeMeal} />
          ))
        )}
      </ScrollView>

      {/* ── FAB with expand menu ── */}
      {fabOpen && (
        <Pressable style={styles.fabBackdrop} onPress={() => setFabOpen(false)} />
      )}
      <View style={[styles.fabArea, { bottom: bottomPadding - 50 }]}>
        {fabOpen && (
          <>
            <Animated.View entering={ZoomIn.duration(180)} style={styles.fabMenuItem}>
              <Pressable
                style={styles.fabMenuBtn}
                onPress={() => {
                  setFabOpen(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/quick-log");
                }}
              >
                <Icon name="edit-3" size={18} color="#0a0a0a" />
              </Pressable>
              <Text style={styles.fabMenuLabel}>Quick Log</Text>
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(220)} style={[styles.fabMenuItem, { marginBottom: 12 }]}>
              <Pressable
                style={styles.fabMenuBtn}
                onPress={() => {
                  setFabOpen(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/snap");
                }}
              >
                <Icon name="camera" size={18} color="#0a0a0a" />
              </Pressable>
              <Text style={styles.fabMenuLabel}>Snap Photo</Text>
            </Animated.View>
          </>
        )}
        <Pressable
          style={[styles.fab, fabOpen && styles.fabOpen]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setFabOpen((v) => !v);
          }}
        >
          <Icon name={fabOpen ? "x" : "plus"} size={28} color="#0a0a0a" />
        </Pressable>
      </View>

      {/* ── Profile sheet ── */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileOpen(false)} />
        <View style={[styles.profileSheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarTxt}>{initials}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{user?.name ?? "User"}</Text>
              <Text style={styles.profileContact}>{user?.email ?? user?.phone ?? ""}</Text>
            </View>
          </View>

          {/* Stats row in profile sheet */}
          {profile && (
            <View style={styles.profileStats}>
              {[
                { label: "Weight", value: `${profile.currentWeight} kg` },
                { label: "Height", value: profile.height ? `${profile.height} cm` : "—" },
                { label: "BMI",    value: bmi ? String(bmi) : "—", color: bmiCat?.color },
                { label: "Goal",   value: `${macroGoals.calories} kcal` },
              ].map((s) => (
                <View key={s.label} style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, s.color ? { color: s.color } : null]}>{s.value}</Text>
                  <Text style={styles.profileStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.profileDivider} />

          <Pressable
            style={styles.profileAction}
            onPress={() => { setProfileOpen(false); router.push("/onboarding"); }}
          >
            <Icon name="edit-3" size={18} color="#888" />
            <Text style={styles.profileActionTxt}>Edit Body Metrics</Text>
            <Icon name="chevron-right" size={16} color="#444" />
          </Pressable>
          <Pressable
            style={[styles.profileAction, styles.logoutAction]}
            onPress={handleLogout}
          >
            <Icon name="log-out" size={18} color="#ff4444" />
            <Text style={[styles.profileActionTxt, { color: "#ff4444" }]}>Sign Out</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  dateText:    { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 2 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  remainBadge: {
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1, borderColor: "#2a2a2a",
  },
  remainBadgeNum:   { fontSize: 18, fontFamily: "Inter_700Bold", color: "#B8F84A" },
  remainBadgeLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },
  avatarBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#B8F84A",
    justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0a0a0a" },

  // BMI
  bmiCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#141414", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a",
    padding: 14, marginBottom: 16, gap: 14,
  },
  bmiLeft:      { alignItems: "center", minWidth: 56 },
  bmiCardLabel: { fontSize: 10, color: "#555", fontFamily: "Inter_400Regular", marginBottom: 2 },
  bmiCardNum:   { fontSize: 26, fontFamily: "Inter_700Bold" },
  bmiMiddle:    { flex: 1, gap: 4 },
  bmiCatPill:   {
    alignSelf: "flex-start", borderRadius: 8,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3,
  },
  bmiCatTxt:    { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bmiStats:     { fontSize: 11, color: "#555", fontFamily: "Inter_400Regular" },
  bmiEditBtn:   { padding: 6 },

  // Macro rings card
  todayCard: {
    backgroundColor: "#141414", borderRadius: 20,
    padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: "#2a2a2a",
  },
  todayCardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 20,
  },
  todayCardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  todayCardSub:   { fontSize: 12, color: "#555", fontFamily: "Inter_400Regular" },
  ringRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  goalRow:    { flexDirection: "row", justifyContent: "space-between" },
  goalItem:   { flexDirection: "row", alignItems: "center", gap: 4 },
  goalDot:    { width: 6, height: 6, borderRadius: 3 },
  goalText:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555" },

  // Remaining macros
  remainingCard: {
    backgroundColor: "#141414", borderRadius: 16,
    borderWidth: 1, borderColor: "#2a2a2a",
    padding: 16, marginBottom: 16,
  },
  remainingTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff", marginBottom: 14 },
  remainingRow:   { flexDirection: "row", justifyContent: "space-around" },
  remainItem:     { alignItems: "center", gap: 4 },
  remainBar: {
    width: 28, height: 60,
    backgroundColor: "#222", borderRadius: 6,
    justifyContent: "flex-end", overflow: "hidden",
    marginBottom: 4,
  },
  remainBarFill: { width: "100%", borderRadius: 6 },
  remainNum:     { fontSize: 18, fontFamily: "Inter_700Bold" },
  remainLabel:   { fontSize: 10, color: "#666", fontFamily: "Inter_500Medium" },
  remainUnit:    { fontSize: 9, color: "#444", fontFamily: "Inter_400Regular" },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  mealCount:    { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },

  empty: {
    alignItems: "center", paddingVertical: 48,
    borderRadius: 16, borderWidth: 1.5,
    borderStyle: "dashed", borderColor: "#2a2a2a",
    gap: 10, paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff", textAlign: "center" },
  emptySub:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666", textAlign: "center", lineHeight: 20 },

  // FAB
  fabBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9 },
  fabArea: { position: "absolute", right: 24, alignItems: "center", zIndex: 10 },
  fab: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: "#B8F84A",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#B8F84A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabOpen: { backgroundColor: "#ccc" },
  fabMenuItem: { alignItems: "center", marginBottom: 14 },
  fabMenuBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#B8F84A",
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
    shadowColor: "#B8F84A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  fabMenuLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#fff" },

  // Profile modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  profileSheet: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1, borderColor: "#2a2a2a",
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: "#333",
    borderRadius: 2, alignSelf: "center", marginBottom: 20,
  },
  profileInfo:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#B8F84A",
    justifyContent: "center", alignItems: "center",
  },
  profileAvatarTxt: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0a0a0a" },
  profileDetails:   { flex: 1 },
  profileName:      { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  profileContact:   { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888" },

  profileStats: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: "#0f0f0f", borderRadius: 14,
    borderWidth: 1, borderColor: "#2a2a2a",
    paddingVertical: 12, marginBottom: 16,
  },
  profileStatItem: { alignItems: "center", gap: 2 },
  profileStatNum:  { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  profileStatLabel:{ fontSize: 10, color: "#555", fontFamily: "Inter_400Regular" },

  profileDivider: { height: 1, backgroundColor: "#2a2a2a", marginBottom: 8 },
  profileAction: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#1e1e1e",
  },
  profileActionTxt: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", color: "#ccc" },
  logoutAction: { borderBottomWidth: 0 },
});
