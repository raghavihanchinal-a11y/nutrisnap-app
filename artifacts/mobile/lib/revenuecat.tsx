import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

// Lazily require react-native-purchases so a missing native module
// doesn't crash the entire app at import time (e.g. in Expo Go).
let Purchases: any = null;
try {
  Purchases = require("react-native-purchases").default;
} catch {
  console.warn("[RevenueCat] react-native-purchases not available — running in stub mode");
}

const REVENUECAT_TEST_API_KEY    = process.env["EXPO_PUBLIC_REVENUECAT_TEST_API_KEY"];
const REVENUECAT_IOS_API_KEY     = process.env["EXPO_PUBLIC_REVENUECAT_IOS_API_KEY"];
const REVENUECAT_ANDROID_API_KEY = process.env["EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY"];

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

function getRevenueCatApiKey(): string {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat API keys not configured.");
  }
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios")     return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

// In Expo Go on a phone, the package's simulated browser store can crash
// because it expects DOM APIs. Only initialize on web or in real native builds.
const isExpoGo =
  Platform.OS !== "web" && Constants.executionEnvironment === "storeClient";

export function initializeRevenueCat() {
  if (!Purchases) {
    console.warn("[RevenueCat] Skipping init — module unavailable");
    return;
  }
  if (isExpoGo) {
    console.warn("[RevenueCat] Skipping init in Expo Go (use a dev/preview build for purchases)");
    return;
  }
  try {
    const apiKey = getRevenueCatApiKey();
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Configured");
  } catch (err) {
    console.warn("[RevenueCat] Init failed:", err);
  }
}

const isPurchasesUsable = Purchases !== null && !isExpoGo;

// ── Safe wrappers that no-op when Purchases is unavailable ───────────────────

async function safeGetCustomerInfo() {
  if (!isPurchasesUsable) return null;
  return Purchases.getCustomerInfo();
}

async function safeGetOfferings() {
  if (!isPurchasesUsable) return null;
  return Purchases.getOfferings();
}

async function safePurchasePackage(pkg: any) {
  if (!isPurchasesUsable) throw new Error("Purchases not available in this environment");
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

async function safeRestorePurchases() {
  if (!isPurchasesUsable) throw new Error("Purchases not available in this environment");
  return Purchases.restorePurchases();
}

// ── Context ──────────────────────────────────────────────────────────────────

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: safeGetCustomerInfo,
    staleTime: 60 * 1000,
    retry: 1,
    enabled: isPurchasesUsable,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: safeGetOfferings,
    staleTime: 300 * 1000,
    retry: 1,
    enabled: isPurchasesUsable,
  });

  const purchaseMutation = useMutation({
    mutationFn: safePurchasePackage,
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: safeRestorePurchases,
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    customerInfoQuery.data?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  return {
    customerInfo:  customerInfoQuery.data ?? null,
    offerings:     offeringsQuery.data ?? null,
    isSubscribed,
    isLoading:     customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase:      purchaseMutation.mutateAsync,
    restore:       restoreMutation.mutateAsync,
    isPurchasing:  purchaseMutation.isPending,
    isRestoring:   restoreMutation.isPending,
    error:         customerInfoQuery.error,
    available:     Purchases !== null,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
