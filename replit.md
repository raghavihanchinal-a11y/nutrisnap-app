# NutriSnap — Workspace

## Overview

pnpm workspace monorepo using TypeScript. NutriSnap is a dark-themed mobile calorie tracker with AI food photo analysis.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Mobile**: Expo SDK ~54, React Native 0.81.5, expo-router ~6
- **API framework**: Express 5
- **AI**: Claude Haiku (`claude-haiku-4-5`) via Anthropic SDK
- **Payments**: RevenueCat (`react-native-purchases` client, `@replit/revenuecat-sdk` server)
- **Build**: esbuild (API server)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/scripts exec tsx src/seedRevenueCat.ts` — seed RevenueCat project (run once)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### `artifacts/api-server` — Express API
- `/api/analyze-food` — POST, sends image to Claude Haiku, returns nutrition JSON
- `/api/auth/request-otp` — POST `{contact, name, method}` → returns `{success, devOtp}` (devOtp shown in UI for development)
- `/api/auth/verify-otp` — POST `{contact, otp}` → returns `{success, name, contact}`

### `artifacts/mobile` — Expo React Native App
- **Theme**: Black `#0a0a0a` background, lime-green `#B8F84A` accents
- **Auth**: Two-step OTP login (email or phone) — `app/login.tsx`
- **Onboarding**: Height/weight/age/activity → BMI preview, Mifflin-St Jeor BMR — `app/onboarding.tsx`
- **Dashboard**: Progress rings, BMI card, macro bars, dual FAB — `app/(tabs)/index.tsx`
- **Snap**: Camera + gallery + ImageManipulator resize → Claude analyze — `app/snap.tsx`
- **Quick Log**: Manual meal entry — `app/quick-log.tsx`
- **History**: 7/30-day charts, calendar, averages — `app/(tabs)/history.tsx`
- **Paywall**: RevenueCat subscription screen — `app/paywall.tsx`

## Key Files

- `artifacts/mobile/context/AppContext.tsx` — Auth user, UserProfile, meals, scan count, freemium logic
- `artifacts/mobile/lib/revenuecat.tsx` — SubscriptionProvider, useSubscription hook
- `artifacts/mobile/components/Icon.tsx` — Unicode icon map
- `scripts/src/seedRevenueCat.ts` — One-time RevenueCat project setup script
- `scripts/src/revenueCatClient.ts` — Replit connectors-based RevenueCat auth client

## RevenueCat Setup

- Project: `proj21f03ba3` (NutriSnap)
- Entitlement: `premium`
- Product: `nutrisnap_premium_monthly` (P1M, $1.99 test / ₹99 production)
- Env vars set: `REVENUECAT_PROJECT_ID`, `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

## Freemium Model

- Free users: 3 scans/day (tracked in AsyncStorage keyed by date)
- `canScan(isSubscribed)` in AppContext checks the limit
- Hitting limit redirects to `/paywall`
- Subscribed users: unlimited scans

## Data Persistence

- `AsyncStorage` keys: `nutrisnap_user`, `nutrisnap_profile`, `nutrisnap_onboarding`, `nutrisnap_meals_<dateKey>`, `nutrisnap_scans_<dateKey>`
- Profile persists across logins — logout only clears `nutrisnap_user`
- Re-login auto-loads existing profile so user skips onboarding

## Important Notes

- Expo `slug` must stay `"mobile"` in app.json — changing it triggers Expo auth prompt
- `expo-file-system/legacy` required for `readAsStringAsync` in Expo SDK 54
- ImageManipulator resizes photos to ≤1024px / JPEG 0.7 before sending to Claude
- OTP server stores OTPs in-memory (10 min expiry); in production integrate SMS/email provider
- RevenueCat test store key is used in `__DEV__` and web; production uses iOS/Android keys
