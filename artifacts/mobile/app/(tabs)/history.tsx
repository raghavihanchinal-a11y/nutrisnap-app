import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { DaySummary, MealEntry, dateKeyFromDate, useApp } from "@/context/AppContext";
import { Icon } from "@/components/Icon";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0a",
  card: "#141414",
  border: "#2a2a2a",
  primary: "#B8F84A",
  text: "#ffffff",
  muted: "#666",
  protein: "#ffffff",
  carbs: "#4A90D9",
  fat: "#E05A5A",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayKey(): string {
  return new Date().toISOString().split("T")[0]!;
}

function dateKeyToDate(dk: string): Date {
  const parts = dk.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatShortDate(dk: string): string {
  return dateKeyToDate(dk).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Calorie Bar Chart ────────────────────────────────────────────────────────
interface ChartProps {
  data: DaySummary[];
  goal: number;
  selectedKey: string;
  onSelect: (dk: string) => void;
  width: number;
}

function CalorieBarChart({ data, goal, selectedKey, onSelect, width }: ChartProps) {
  const CHART_H = 150;
  const LABEL_H = 30;
  const PAD_L = 34;
  const PAD_R = 8;
  const PAD_T = 10;
  const plotW = width - PAD_L - PAD_R;
  const n = data.length;
  if (n === 0 || width === 0) return null;

  const slot = plotW / n;
  const barW = Math.max(6, slot * 0.55);
  const maxCal = Math.max(goal * 1.25, ...data.map((d) => d.calories), 100);
  const toY = (cal: number) =>
    CHART_H - PAD_T - (cal / maxCal) * (CHART_H - PAD_T);
  const goalY = toY(goal);
  const today = todayKey();

  return (
    <Svg width={width} height={CHART_H + LABEL_H}>
      {/* Grid lines */}
      {([0, 0.5, 1] as number[]).map((frac) => {
        const val = Math.round(maxCal * frac);
        const y = toY(maxCal * frac);
        return (
          <G key={frac}>
            <Line
              x1={PAD_L} y1={y}
              x2={width - PAD_R} y2={y}
              stroke="#1e1e1e" strokeWidth={1}
            />
            <SvgText
              x={PAD_L - 4} y={y + 3}
              fontSize={8} fill="#444"
              textAnchor="end"
            >
              {val}
            </SvgText>
          </G>
        );
      })}

      {/* Goal dashed line */}
      <Line
        x1={PAD_L} y1={goalY}
        x2={width - PAD_R} y2={goalY}
        stroke={C.primary} strokeWidth={1.2}
        strokeDasharray="5 3"
      />

      {/* Bars */}
      {data.map((d, i) => {
        const cx = PAD_L + i * slot + slot / 2;
        const bx = cx - barW / 2;
        const barH = Math.max(4, (d.calories / maxCal) * (CHART_H - PAD_T));
        const by = CHART_H - barH;
        const isSel = d.dateKey === selectedKey;
        const isToday = d.dateKey === today;
        const fill = isSel ? C.primary : isToday ? "#4a6e1a" : "#243315";
        const labelColor = isSel ? C.primary : "#555";
        const date = dateKeyToDate(d.dateKey);
        const dayLetter = date.toLocaleDateString(undefined, { weekday: "narrow" });
        const dayNum = String(date.getDate());

        return (
          <G key={d.dateKey} onPress={() => onSelect(d.dateKey)}>
            {/* Tap target */}
            <Rect
              x={cx - slot / 2} y={0}
              width={slot} height={CHART_H + LABEL_H}
              fill="transparent"
            />
            <Rect x={bx} y={by} width={barW} height={barH} rx={4} fill={fill} />
            <SvgText
              x={cx} y={CHART_H + 12}
              fontSize={9} fill={labelColor}
              textAnchor="middle"
              fontWeight={isSel ? "700" : "400"}
            >
              {dayLetter}
            </SvgText>
            <SvgText
              x={cx} y={CHART_H + 24}
              fontSize={9} fill={labelColor}
              textAnchor="middle"
            >
              {dayNum}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Month Calendar ───────────────────────────────────────────────────────────
interface CalendarProps {
  year: number;
  month: number;
  summaryMap: Record<string, DaySummary>;
  selectedKey: string;
  goal: number;
  onSelectDay: (dk: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function MonthCalendar({
  year, month, summaryMap, selectedKey, goal,
  onSelectDay, onPrevMonth, onNextMonth,
}: CalendarProps) {
  const today = todayKey();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const nowDate = new Date();
  const canGoNext =
    year < nowDate.getFullYear() ||
    (year === nowDate.getFullYear() && month < nowDate.getMonth());

  return (
    <View style={calS.wrapper}>
      <View style={calS.header}>
        <Pressable style={calS.navBtn} onPress={onPrevMonth}>
          <Icon name="chevron-left" size={18} color={C.text} />
        </Pressable>
        <Text style={calS.monthTitle}>{formatMonthYear(firstDay)}</Text>
        <Pressable
          style={calS.navBtn}
          onPress={onNextMonth}
          disabled={!canGoNext}
        >
          <Icon name="chevron-right" size={18} color={canGoNext ? C.text : "#333"} />
        </Pressable>
      </View>

      <View style={calS.dowRow}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <Text key={d} style={calS.dowLabel}>{d}</Text>
        ))}
      </View>

      {weeks.map((wk, wi) => (
        <View key={wi} style={calS.weekRow}>
          {wk.map((day, di) => {
            if (!day) return <View key={di} style={calS.cell} />;
            const dk = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const summary = summaryMap[dk];
            const isSel = dk === selectedKey;
            const isToday = dk === today;
            const hasData = !!summary && summary.mealCount > 0;
            const isFuture = dk > today;
            const pct = summary && goal > 0 ? summary.calories / goal : 0;

            return (
              <Pressable
                key={di}
                style={[
                  calS.cell,
                  isSel && calS.cellSel,
                  isToday && !isSel && calS.cellToday,
                ]}
                onPress={() => !isFuture && onSelectDay(dk)}
                disabled={isFuture}
              >
                <Text style={[
                  calS.dayNum,
                  isSel && calS.dayNumSel,
                  isToday && !isSel && { color: C.primary },
                  isFuture && { color: "#2e2e2e" },
                ]}>
                  {day}
                </Text>
                {hasData && !isSel && (
                  <View style={[calS.dot, { backgroundColor: pct >= 0.85 ? C.primary : "#444" }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calS = StyleSheet.create({
  wrapper: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  monthTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  dowRow: { flexDirection: "row", marginBottom: 2 },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    color: "#444",
    fontFamily: "Inter_500Medium",
    paddingVertical: 4,
  },
  weekRow: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    margin: 1,
  },
  cellSel: { backgroundColor: C.primary },
  cellToday: { borderWidth: 1, borderColor: C.primary },
  dayNum: { fontSize: 12, color: C.text, fontFamily: "Inter_500Medium" },
  dayNumSel: { color: "#0a0a0a", fontFamily: "Inter_700Bold" },
  dot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

// ─── Macro Progress Bar ───────────────────────────────────────────────────────
function MacroBar({
  label, value, goal, color,
}: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={mbS.row}>
      <View style={mbS.labels}>
        <Text style={mbS.label}>{label}</Text>
        <Text style={mbS.value}>
          {Math.round(value)}
          <Text style={mbS.goal}>/{goal}g</Text>
        </Text>
      </View>
      <View style={mbS.track}>
        <View style={[mbS.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mbS = StyleSheet.create({
  row: { marginBottom: 12 },
  labels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  label: { fontSize: 12, color: C.muted, fontFamily: "Inter_400Regular" },
  value: { fontSize: 12, color: C.text, fontFamily: "Inter_600SemiBold" },
  goal: { fontSize: 11, color: C.muted, fontFamily: "Inter_400Regular" },
  track: { height: 5, backgroundColor: "#222", borderRadius: 3, overflow: "hidden" },
  fill: { height: 5, borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Period = "7" | "30";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { macroGoals, getHistorySummaries, getMealsForDate } = useApp();

  const topPad = Platform.OS === "web" ? 16 : insets.top + 16;
  const botPad = Platform.OS === "web" ? 84 + 16 : insets.bottom + 84;

  const [period, setPeriod] = useState<Period>("7");
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(0);

  const today = todayKey();
  const nowDate = new Date();
  const [calYear, setCalYear] = useState(nowDate.getFullYear());
  const [calMonth, setCalMonth] = useState(nowDate.getMonth());
  const [selectedKey, setSelectedKey] = useState(today);
  const [dayMeals, setDayMeals] = useState<MealEntry[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  // Load period summaries
  const loadSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistorySummaries(Number(period));
      setSummaries(data);
    } finally {
      setLoading(false);
    }
  }, [period, getHistorySummaries]);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  // Load meals for selected day
  useEffect(() => {
    setDayLoading(true);
    getMealsForDate(selectedKey).then((meals) => {
      setDayMeals(meals);
      setDayLoading(false);
    });
  }, [selectedKey, getMealsForDate]);

  const summaryMap = useMemo<Record<string, DaySummary>>(() => {
    const m: Record<string, DaySummary> = {};
    summaries.forEach((s) => { m[s.dateKey] = s; });
    return m;
  }, [summaries]);

  const selectedSummary = summaryMap[selectedKey];
  const daysLogged = summaries.filter((d) => d.mealCount > 0).length;
  const loggedSummaries = summaries.filter((d) => d.mealCount > 0);
  const avgCalories = loggedSummaries.length > 0
    ? Math.round(loggedSummaries.reduce((s, d) => s + d.calories, 0) / loggedSummaries.length)
    : 0;
  const bestDay = loggedSummaries.reduce<DaySummary | null>((best, d) => {
    if (!best) return d;
    const dDiff = Math.abs(d.calories - macroGoals.calories);
    const bDiff = Math.abs(best.calories - macroGoals.calories);
    return dDiff < bDiff ? d : best;
  }, null);

  const handleChartLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  }, []);

  const handlePrevMonth = useCallback(() => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }, [calMonth]);

  const handleNextMonth = useCallback(() => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }, [calMonth]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: botPad, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <View style={styles.toggle}>
            {(["7", "30"] as Period[]).map((p) => (
              <Pressable
                key={p}
                style={[styles.toggleBtn, period === p && styles.toggleBtnOn]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.toggleTxt, period === p && styles.toggleTxtOn]}>
                  {p === "7" ? "7 Days" : "30 Days"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
        ) : (
          <Animated.View entering={FadeIn.duration(280)}>

            {/* ── Stats ── */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{daysLogged}</Text>
                <Text style={styles.statLabel}>Days{"\n"}logged</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{avgCalories || "—"}</Text>
                <Text style={styles.statLabel}>Avg{"\n"}calories</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statNum, { fontSize: 14 }]}>
                  {bestDay ? dateKeyToDate(bestDay.dateKey).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                </Text>
                <Text style={styles.statLabel}>Best{"\n"}day</Text>
              </View>
            </View>

            {/* ── Calorie Chart ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Calories · {period} days</Text>
                <View style={styles.legendRow}>
                  <View style={styles.legendLine} />
                  <Text style={styles.legendTxt}>Goal</Text>
                </View>
              </View>
              <View onLayout={handleChartLayout} style={styles.chartBox}>
                {chartWidth > 0 && (
                  <CalorieBarChart
                    data={summaries}
                    goal={macroGoals.calories}
                    selectedKey={selectedKey}
                    onSelect={(dk) => {
                      setSelectedKey(dk);
                      const d = dateKeyToDate(dk);
                      setCalYear(d.getFullYear());
                      setCalMonth(d.getMonth());
                    }}
                    width={chartWidth}
                  />
                )}
              </View>
              <Text style={styles.chartHint}>Tap a bar to inspect that day</Text>
            </View>

            {/* ── Macro Averages ── */}
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { marginBottom: 16 }]}>
                Macro averages · {period} days
              </Text>
              <View style={styles.macroAvgRow}>
                {[
                  { label: "Protein", val: loggedSummaries.reduce((s, d) => s + d.protein, 0) / Math.max(loggedSummaries.length, 1), color: C.protein },
                  { label: "Carbs",   val: loggedSummaries.reduce((s, d) => s + d.carbs, 0)   / Math.max(loggedSummaries.length, 1), color: C.carbs },
                  { label: "Fat",     val: loggedSummaries.reduce((s, d) => s + d.fat, 0)     / Math.max(loggedSummaries.length, 1), color: C.fat },
                ].map((m) => (
                  <View key={m.label} style={styles.macroAvgItem}>
                    <View style={[styles.macroAvgDot, { backgroundColor: m.color }]} />
                    <Text style={styles.macroAvgNum}>{Math.round(m.val)}<Text style={styles.macroAvgUnit}>g</Text></Text>
                    <Text style={styles.macroAvgLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Calendar ── */}
            <MonthCalendar
              year={calYear}
              month={calMonth}
              summaryMap={summaryMap}
              selectedKey={selectedKey}
              goal={macroGoals.calories}
              onSelectDay={(dk) => setSelectedKey(dk)}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            {/* ── Selected Day Detail ── */}
            <View style={styles.card}>
              <View style={styles.dayHeader}>
                <Text style={styles.cardTitle}>{formatShortDate(selectedKey)}</Text>
                {selectedKey === today && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillTxt}>Today</Text>
                  </View>
                )}
              </View>

              {selectedSummary && selectedSummary.mealCount > 0 ? (
                <>
                  {/* Calorie summary */}
                  <View style={styles.calRow}>
                    <View style={styles.calPill}>
                      <Text style={styles.calPillNum}>{Math.round(selectedSummary.calories)}</Text>
                      <Text style={styles.calPillUnit}>kcal</Text>
                    </View>
                    <View style={styles.calMeta}>
                      <Text style={styles.calGoal}>Goal: {macroGoals.calories} kcal</Text>
                      <Text style={[
                        styles.calDiff,
                        { color: selectedSummary.calories > macroGoals.calories ? C.fat : C.primary },
                      ]}>
                        {selectedSummary.calories > macroGoals.calories
                          ? `+${Math.round(selectedSummary.calories - macroGoals.calories)} over`
                          : `${Math.round(macroGoals.calories - selectedSummary.calories)} under`}
                      </Text>
                    </View>
                  </View>

                  {/* Macro bars */}
                  <View style={{ marginTop: 4 }}>
                    <MacroBar label="Protein" value={selectedSummary.protein} goal={macroGoals.protein} color={C.protein} />
                    <MacroBar label="Carbs"   value={selectedSummary.carbs}   goal={macroGoals.carbs}   color={C.carbs} />
                    <MacroBar label="Fat"     value={selectedSummary.fat}     goal={macroGoals.fat}     color={C.fat} />
                  </View>
                </>
              ) : (
                <View style={styles.emptyDay}>
                  <Icon name="calendar" size={28} color="#2a2a2a" />
                  <Text style={styles.emptyDayTxt}>No meals logged this day</Text>
                </View>
              )}
            </View>

            {/* ── Meal list for selected day ── */}
            {selectedSummary && selectedSummary.mealCount > 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>
                  {selectedSummary.mealCount} meal{selectedSummary.mealCount !== 1 ? "s" : ""}
                </Text>
                {dayLoading ? (
                  <ActivityIndicator color={C.primary} />
                ) : (
                  dayMeals.map((meal) => (
                    <View key={meal.id} style={styles.mealRow}>
                      <View style={styles.mealScore}>
                        <Text style={styles.mealScoreTxt}>{meal.nutriScore}</Text>
                      </View>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName} numberOfLines={1}>{meal.foodName}</Text>
                        <Text style={styles.mealMeta}>
                          {meal.estimatedWeight}g · {meal.protein}p · {meal.carbs}c · {meal.fat}f
                        </Text>
                      </View>
                      <Text style={styles.mealCal}>{meal.calories} kcal</Text>
                    </View>
                  ))
                )}
              </View>
            )}

          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.text },
  toggle: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  toggleBtnOn: { backgroundColor: C.primary },
  toggleTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.muted },
  toggleTxtOn: { color: "#0a0a0a" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.primary, marginBottom: 4 },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.muted, textAlign: "center", lineHeight: 14 },

  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendLine: { width: 18, height: 2, backgroundColor: C.primary, borderRadius: 1 },
  legendTxt: { fontSize: 10, color: C.muted, fontFamily: "Inter_400Regular" },
  chartBox: { width: "100%" },
  chartHint: { fontSize: 10, color: "#333", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },

  macroAvgRow: { flexDirection: "row", justifyContent: "space-around" },
  macroAvgItem: { alignItems: "center", gap: 5 },
  macroAvgDot: { width: 10, height: 10, borderRadius: 5 },
  macroAvgNum: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  macroAvgUnit: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.muted },
  macroAvgLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: C.muted },

  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  todayPill: {
    backgroundColor: "#1a3a1a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.primary,
  },
  todayPillTxt: { fontSize: 10, color: C.primary, fontFamily: "Inter_600SemiBold" },

  calRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  calPill: {
    backgroundColor: "#1a3a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
  },
  calPillNum: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.primary },
  calPillUnit: { fontSize: 10, color: C.primary, fontFamily: "Inter_400Regular" },
  calMeta: { gap: 4 },
  calGoal: { fontSize: 12, color: C.muted, fontFamily: "Inter_400Regular" },
  calDiff: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  emptyDay: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#222",
  },
  emptyDayTxt: { fontSize: 13, color: "#444", fontFamily: "Inter_400Regular" },

  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    gap: 10,
  },
  mealScore: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#1a3a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  mealScoreTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.primary },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text },
  mealMeta: { fontSize: 10, color: C.muted, fontFamily: "Inter_400Regular", marginTop: 2 },
  mealCal: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
});
