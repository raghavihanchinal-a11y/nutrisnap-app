import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthUser {
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface UserProfile {
  age: number;
  gender: "male" | "female" | "other";
  currentWeight: number;
  height: number;
  targetWeight: number;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  dailyCalorieGoal: number;
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  id: string;
  foodName: string;
  estimatedWeight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  nutriScore: string;
  timestamp: number;
  imageUri?: string;
}

export interface DaySummary {
  dateKey: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

interface AppContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  todayMeals: MealEntry[];
  macroGoals: MacroGoals;
  onboardingComplete: boolean;
  bmi: number | null;
  scanCount: number;
  FREE_SCAN_LIMIT: number;
  saveUser: (user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  addMeal: (meal: MealEntry) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  getTodayConsumed: () => MacroGoals;
  getMealsForDate: (dateKey: string) => Promise<MealEntry[]>;
  getHistorySummaries: (days: number) => Promise<DaySummary[]>;
  incrementScanCount: () => Promise<void>;
  canScan: (isSubscribed: boolean) => boolean;
}

const STORAGE_KEYS = {
  USER:        "nutrisnap_user",
  PROFILE:     "nutrisnap_profile",
  MEALS:       "nutrisnap_meals",
  ONBOARDING:  "nutrisnap_onboarding",
  SCAN_PREFIX: "nutrisnap_scans",
};

export const FREE_SCAN_LIMIT = 3;

// Mifflin-St Jeor BMR
function calculateBMR(p: UserProfile): number {
  let bmr: number;
  if (p.gender === "male")        bmr = 10 * p.currentWeight + 6.25 * p.height - 5 * p.age + 5;
  else if (p.gender === "female") bmr = 10 * p.currentWeight + 6.25 * p.height - 5 * p.age - 161;
  else                            bmr = 10 * p.currentWeight + 6.25 * p.height - 5 * p.age - 78;

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[p.activityLevel] ?? 1.55));
}

// 30% protein / 40% carbs / 30% fat
function getMacroGoals(calories: number): MacroGoals {
  return {
    calories,
    protein: Math.round((calories * 0.30) / 4),
    carbs:   Math.round((calories * 0.40) / 4),
    fat:     Math.round((calories * 0.30) / 9),
  };
}

export function calculateBMI(weight: number, height: number): number {
  if (!height) return 0;
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

export function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "#4A90D9" };
  if (bmi < 25)   return { label: "Normal",      color: "#B8F84A" };
  if (bmi < 30)   return { label: "Overweight",  color: "#F4A23A" };
  return               { label: "Obese",         color: "#E05A5A" };
}

export function todayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

export function dateKeyFromDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                   = useState<AuthUser | null>(null);
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [todayMeals, setTodayMeals]       = useState<MealEntry[]>([]);
  const [macroGoals, setMacroGoals]       = useState<MacroGoals>({ calories: 2000, protein: 150, carbs: 200, fat: 67 });
  const [onboardingComplete, setOnboarding] = useState(false);
  const [scanCount, setScanCount]         = useState(0);

  const bmi: number | null =
    profile?.currentWeight && profile?.height
      ? calculateBMI(profile.currentWeight, profile.height)
      : null;

  useEffect(() => {
    (async () => {
      try {
        const scanKey = `${STORAGE_KEYS.SCAN_PREFIX}_${todayKey()}`;
        const [userStr, profileStr, mealsStr, onboardingStr, scanStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(`${STORAGE_KEYS.MEALS}_${todayKey()}`),
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
          AsyncStorage.getItem(scanKey),
        ]);
        if (userStr)     setUser(JSON.parse(userStr));
        if (profileStr) {
          const p = JSON.parse(profileStr) as UserProfile;
          setProfile(p);
          setMacroGoals(getMacroGoals(p.dailyCalorieGoal || calculateBMR(p)));
        }
        if (mealsStr)    setTodayMeals(JSON.parse(mealsStr));
        if (onboardingStr === "true") setOnboarding(true);
        if (scanStr)     setScanCount(parseInt(scanStr, 10) || 0);
      } catch (_) {}
    })();
  }, []);

  const saveUser = useCallback(async (u: AuthUser) => {
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    // Load profile for this user if one exists (profile persists across logins)
    const profileStr = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (profileStr) {
      const p = JSON.parse(profileStr) as UserProfile;
      setProfile(p);
      setMacroGoals(getMacroGoals(p.dailyCalorieGoal || calculateBMR(p)));
      const onboardingStr = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
      if (onboardingStr === "true") setOnboarding(true);
    }
  }, []);

  const logout = useCallback(async () => {
    // Only clear auth — keep profile and meals so re-login is seamless
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  const saveProfile = useCallback(async (p: UserProfile) => {
    const daily = p.dailyCalorieGoal || calculateBMR(p);
    const full: UserProfile = { ...p, dailyCalorieGoal: daily };
    setProfile(full);
    setMacroGoals(getMacroGoals(daily));
    setOnboarding(true);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.PROFILE,    JSON.stringify(full)],
      [STORAGE_KEYS.ONBOARDING, "true"],
    ]);
  }, []);

  const addMeal = useCallback(async (meal: MealEntry) => {
    setTodayMeals((prev) => {
      const updated = [meal, ...prev];
      AsyncStorage.setItem(`${STORAGE_KEYS.MEALS}_${todayKey()}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeMeal = useCallback(async (id: string) => {
    setTodayMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      AsyncStorage.setItem(`${STORAGE_KEYS.MEALS}_${todayKey()}`, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const getTodayConsumed = useCallback((): MacroGoals => {
    return todayMeals.reduce(
      (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todayMeals]);

  const getMealsForDate = useCallback(async (dateKey: string): Promise<MealEntry[]> => {
    try {
      const str = await AsyncStorage.getItem(`${STORAGE_KEYS.MEALS}_${dateKey}`);
      return str ? JSON.parse(str) : [];
    } catch { return []; }
  }, []);

  const getHistorySummaries = useCallback(async (days: number): Promise<DaySummary[]> => {
    const summaries: DaySummary[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dk = dateKeyFromDate(d);
      let meals: MealEntry[] = dk === todayKey() ? todayMeals : await getMealsForDate(dk);
      summaries.push({
        dateKey: dk,
        calories: meals.reduce((s, m) => s + m.calories, 0),
        protein:  meals.reduce((s, m) => s + m.protein,  0),
        carbs:    meals.reduce((s, m) => s + m.carbs,    0),
        fat:      meals.reduce((s, m) => s + m.fat,      0),
        mealCount: meals.length,
      });
    }
    return summaries;
  }, [todayMeals, getMealsForDate]);

  const incrementScanCount = useCallback(async () => {
    const next = scanCount + 1;
    setScanCount(next);
    await AsyncStorage.setItem(`${STORAGE_KEYS.SCAN_PREFIX}_${todayKey()}`, String(next));
  }, [scanCount]);

  const canScan = useCallback((isSubscribed: boolean): boolean => {
    if (isSubscribed) return true;
    return scanCount < FREE_SCAN_LIMIT;
  }, [scanCount]);

  return (
    <AppContext.Provider value={{
      user, profile, todayMeals, macroGoals, onboardingComplete, bmi,
      scanCount, FREE_SCAN_LIMIT,
      saveUser, logout, saveProfile, addMeal, removeMeal,
      getTodayConsumed, getMealsForDate, getHistorySummaries,
      incrementScanCount, canScan,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
