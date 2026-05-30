import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { initializeMobileAds } from "@/components/AdBanner";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Initialize RevenueCat once at app start
try {
  initializeRevenueCat();
} catch (err: any) {
  // In development without env vars set, silently skip; alert only in production
  if (!__DEV__) {
    Alert.alert("RevenueCat Unavailable", err?.message ?? "Unknown error");
  }
}

// Initialize AdMob SDK once at app start (no-ops on web / Expo Go)
initializeMobileAds();

function RootLayoutNav() {
  const { user, onboardingComplete, isLoading } = useApp();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      if (pathname !== "/login") router.replace("/login");
    } else if (!onboardingComplete) {
      if (pathname !== "/onboarding") router.replace("/onboarding");
    }
  }, [user, onboardingComplete, pathname, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
      <Stack.Screen name="login"      options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="snap"       options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="quick-log"  options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="paywall"    options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AppProvider>
                <SubscriptionProvider>
                  <RootLayoutNav />
                </SubscriptionProvider>
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
