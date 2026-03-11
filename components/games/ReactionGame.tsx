// components/games/ReactionGame.tsx
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { GameProps } from "./gameTypes";

const { width: SW } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
type GameMode = "menu" | "classic" | "focus" | "strobe" | "series";
type PhaseState = "idle" | "waiting" | "ready" | "tooEarly" | "result";

type ScoreEntry = { time: number; rating: RatingKey };
type RatingKey = "god" | "great" | "good" | "ok" | "miss";

const RATING: Record<
  RatingKey,
  { label: string; color: string; emoji: string }
> = {
  god: { label: "TANRI MODU", color: "#f59e0b", emoji: "⚡" },
  great: { label: "Mükemmel", color: "#10b981", emoji: "🚀" },
  good: { label: "Çok İyi", color: "#3b82f6", emoji: "👍" },
  ok: { label: "İdare Eder", color: "#a855f7", emoji: "😐" },
  miss: { label: "Çok Yavaş", color: "#ef4444", emoji: "🐢" },
};

function getRating(ms: number): RatingKey {
  if (ms < 170) return "god";
  if (ms < 250) return "great";
  if (ms < 350) return "good";
  if (ms < 500) return "ok";
  return "miss";
}

// Focus mode: renk seti
const FOCUS_COLORS = [
  { bg: "#10b981", label: "YEŞİL", isTarget: true },
  { bg: "#ef4444", label: "KIRMIZI", isTarget: false },
  { bg: "#3b82f6", label: "MAVİ", isTarget: false },
  { bg: "#f59e0b", label: "SARI", isTarget: false },
  { bg: "#a855f7", label: "MOR", isTarget: false },
];

// Strobe: rastgele renk flash
const STROBE_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
];

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: value / max,
      duration: 500,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [value, max]);
  const w = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  return (
    <View
      style={{
        height: 5,
        backgroundColor: "#ffffff10",
        borderRadius: 3,
        overflow: "hidden",
        marginTop: 3,
      }}
    >
      <Animated.View
        style={{ width: w, height: 5, backgroundColor: color, borderRadius: 3 }}
      />
    </View>
  );
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────
function PulseRing({ color, active }: { color: string; active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      opacity.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.6,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    opacity.setValue(0.6);
    loop.start();
    return () => loop.stop();
  }, [active, color]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function ReactionGame({ colors, insets }: GameProps) {
  const [mode, setMode] = useState<GameMode>("menu");
  const [phase, setPhase] = useState<PhaseState>("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [seriesScores, setSeriesScores] = useState<number[]>([]);
  const [seriesIdx, setSeriesIdx] = useState(0); // 0-4
  const [seriesDone, setSeriesDone] = useState(false);

  // Focus mode
  const [focusColor, setFocusColor] = useState(FOCUS_COLORS[0]);
  const [focusFail, setFocusFail] = useState(false);
  const [focusStreak, setFocusStreak] = useState(0);

  // Strobe mode
  const [strobeColor, setStrobeColor] = useState(STROBE_COLORS[0]);
  const [strobeActive, setStrobeActive] = useState(false);

  const startTime = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strobeInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animations ──────────────────────────────────────────────────────────
  const bgAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const resultSlide = useRef(new Animated.Value(50)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const timerBarRef = useRef<Animated.CompositeAnimation | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const streakScale = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const pulseStreak = useCallback(() => {
    streakScale.setValue(1.5);
    Animated.spring(streakScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 6,
      stiffness: 300,
    }).start();
  }, [streakScale]);

  const showResult = useCallback(() => {
    resultSlide.setValue(40);
    resultOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(resultSlide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 12,
        stiffness: 260,
      }),
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [resultSlide, resultOpacity]);

  // ── Timer bar (waiting phase progress) ────────────────────────────────
  const startTimerBar = useCallback(
    (delay: number) => {
      timerBarAnim.setValue(1);
      timerBarRef.current = Animated.timing(timerBarAnim, {
        toValue: 0,
        duration: delay,
        useNativeDriver: false,
        easing: Easing.linear,
      });
      timerBarRef.current.start();
    },
    [timerBarAnim],
  );

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (strobeInterval.current) clearInterval(strobeInterval.current);
    };
  }, []);

  const clearAllTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (strobeInterval.current) clearInterval(strobeInterval.current);
    timerBarRef.current?.stop();
  };

  // ── CLASSIC MODE LOGIC ─────────────────────────────────────────────────
  const handleClassicPress = useCallback(() => {
    if (phase === "idle" || phase === "result" || phase === "tooEarly") {
      setPhase("waiting");
      setReactionTime(null);
      const delay = 1200 + Math.random() * 3000;
      startTimerBar(delay);
      timer.current = setTimeout(() => {
        setPhase("ready");
        startTime.current = Date.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        // Pulse on ready
        scaleAnim.setValue(0.88);
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 7,
          stiffness: 350,
        }).start();
      }, delay);
    } else if (phase === "waiting") {
      clearAllTimers();
      setPhase("tooEarly");
      setStreak(0);
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (phase === "ready") {
      const t = Date.now() - startTime.current;
      const r = getRating(t);
      setReactionTime(t);
      const entry: ScoreEntry = { time: t, rating: r };
      setHistory((h) => [...h.slice(-9), entry]);
      const newBest = best === null || t < best ? t : best;
      setBest(newBest);
      const newStreak = r === "miss" ? 0 : streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (newStreak > streak) pulseStreak();
      setPhase("result");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showResult();
    }
  }, [
    phase,
    streak,
    best,
    bestStreak,
    startTimerBar,
    triggerShake,
    pulseStreak,
    showResult,
    scaleAnim,
  ]);

  // ── FOCUS MODE LOGIC ──────────────────────────────────────────────────
  const startFocusRound = useCallback(() => {
    setPhase("waiting");
    setFocusFail(false);
    setReactionTime(null);
    const delay = 800 + Math.random() * 2500;
    // Pick random color; 40% chance it's green (target)
    const isTarget = Math.random() < 0.4;
    const nonTargets = FOCUS_COLORS.filter((c) => !c.isTarget);
    const chosen = isTarget
      ? FOCUS_COLORS[0]
      : nonTargets[Math.floor(Math.random() * nonTargets.length)];
    timer.current = setTimeout(() => {
      setFocusColor(chosen);
      setPhase("ready");
      startTime.current = Date.now();
      if (chosen.isTarget)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, delay);
  }, []);

  const handleFocusPress = useCallback(() => {
    if (phase === "idle" || phase === "result") {
      startFocusRound();
    } else if (phase === "waiting") {
      // Pressed during wait = too early → fail
      clearAllTimers();
      setFocusFail(true);
      setFocusStreak(0);
      setPhase("result");
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (phase === "ready") {
      const t = Date.now() - startTime.current;
      if (focusColor.isTarget) {
        // Correct tap
        setReactionTime(t);
        setFocusStreak((s) => s + 1);
        pulseStreak();
        const newBest = best === null || t < best ? t : best;
        setBest(newBest);
        setHistory((h) => [...h.slice(-9), { time: t, rating: getRating(t) }]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Wrong color tapped
        setFocusFail(true);
        setFocusStreak(0);
        triggerShake();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setPhase("result");
      showResult();
    }
  }, [
    phase,
    focusColor,
    best,
    startFocusRound,
    triggerShake,
    pulseStreak,
    showResult,
  ]);

  // ── STROBE MODE LOGIC ─────────────────────────────────────────────────
  const startStrobe = useCallback(() => {
    setPhase("waiting");
    setReactionTime(null);
    let idx = 0;
    // Flash colors rapidly for 2-5 seconds
    strobeInterval.current = setInterval(() => {
      setStrobeColor(
        STROBE_COLORS[Math.floor(Math.random() * STROBE_COLORS.length)],
      );
    }, 120);
    const delay = 1500 + Math.random() * 3000;
    timer.current = setTimeout(() => {
      if (strobeInterval.current) clearInterval(strobeInterval.current);
      setStrobeColor("#10b981"); // Green = GO
      setStrobeActive(true);
      setPhase("ready");
      startTime.current = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, delay);
  }, []);

  const handleStrobePress = useCallback(() => {
    if (phase === "idle" || phase === "result") {
      setStrobeActive(false);
      startStrobe();
    } else if (phase === "waiting") {
      clearAllTimers();
      setStreak(0);
      setStrobeActive(false);
      setPhase("tooEarly");
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (phase === "ready") {
      const t = Date.now() - startTime.current;
      setStrobeActive(false);
      setReactionTime(t);
      const newBest = best === null || t < best ? t : best;
      setBest(newBest);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      pulseStreak();
      setHistory((h) => [...h.slice(-9), { time: t, rating: getRating(t) }]);
      setPhase("result");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showResult();
    }
  }, [
    phase,
    best,
    streak,
    bestStreak,
    startStrobe,
    triggerShake,
    pulseStreak,
    showResult,
  ]);

  // ── SERIES MODE LOGIC ─────────────────────────────────────────────────
  const startSeriesRound = useCallback(() => {
    setPhase("waiting");
    setReactionTime(null);
    const delay = 1000 + Math.random() * 2500;
    startTimerBar(delay);
    timer.current = setTimeout(() => {
      setPhase("ready");
      startTime.current = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      scaleAnim.setValue(0.88);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 7,
        stiffness: 350,
      }).start();
    }, delay);
  }, [startTimerBar, scaleAnim]);

  const handleSeriesPress = useCallback(() => {
    if (seriesDone) {
      // Reset
      setSeriesScores([]);
      setSeriesIdx(0);
      setSeriesDone(false);
      setPhase("idle");
      return;
    }
    if (phase === "idle") {
      startSeriesRound();
    } else if (phase === "waiting") {
      clearAllTimers();
      setPhase("tooEarly");
      triggerShake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (phase === "ready") {
      const t = Date.now() - startTime.current;
      const newScores = [...seriesScores, t];
      setSeriesScores(newScores);
      setReactionTime(t);
      const newBest = best === null || t < best ? t : best;
      setBest(newBest);
      const nextIdx = seriesIdx + 1;
      if (nextIdx >= 5) {
        setSeriesDone(true);
        setPhase("result");
      } else {
        setSeriesIdx(nextIdx);
        setPhase("result");
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showResult();
    } else if (phase === "result" && !seriesDone) {
      startSeriesRound();
    } else if (phase === "tooEarly") {
      startSeriesRound();
    }
  }, [
    phase,
    seriesScores,
    seriesIdx,
    seriesDone,
    best,
    startSeriesRound,
    triggerShake,
    showResult,
  ]);

  // ── RESET ─────────────────────────────────────────────────────────────
  const resetAll = () => {
    clearAllTimers();
    setPhase("idle");
    setReactionTime(null);
    setStreak(0);
    setSeriesScores([]);
    setSeriesIdx(0);
    setSeriesDone(false);
    setStrobeActive(false);
    setFocusStreak(0);
    setFocusFail(false);
    timerBarAnim.setValue(1);
  };

  const goMenu = () => {
    resetAll();
    setMode("menu");
  };

  // ─── MENU SCREEN ─────────────────────────────────────────────────────────
  if (mode === "menu") {
    const modes = [
      {
        id: "classic" as GameMode,
        emoji: "⚡",
        title: "Klasik Refleks",
        desc: "Yeşil ışık gelince bas. Ne kadar hızlısın?",
        color: "#10b981",
        bg: "#10b98118",
      },
      {
        id: "focus" as GameMode,
        emoji: "🎯",
        title: "Konsantrasyon",
        desc: "SADECE yeşilde bas. Yanlış renge basarsan kaybedersin!",
        color: "#3b82f6",
        bg: "#3b82f618",
      },
      {
        id: "strobe" as GameMode,
        emoji: "🌀",
        title: "Stroboskop",
        desc: "Renkler deli gibi yanıp söner. Yeşil anı yakala!",
        color: "#a855f7",
        bg: "#a855f718",
      },
      {
        id: "series" as GameMode,
        emoji: "📊",
        title: "Seri Analiz",
        desc: "5 deneme yap, ortalamanı ve grafiğini gör.",
        color: "#f59e0b",
        bg: "#f59e0b18",
      },
    ];
    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 24, marginTop: 8 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -0.5,
            }}
          >
            Refleks & Konsantrasyon
          </Text>
          <Text style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
            Bir mod seç ve başla
          </Text>
        </View>

        {best !== null && (
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f59e0b18",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#f59e0b44",
              }}
            >
              <Text
                style={{ color: "#f59e0b", fontSize: 11, fontWeight: "700" }}
              >
                👑 EN İYİ
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                {best} ms
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#3b82f618",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#3b82f644",
              }}
            >
              <Text
                style={{ color: "#3b82f6", fontSize: 11, fontWeight: "700" }}
              >
                🔥 EN UZUN SERİ
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                {bestStreak}x
              </Text>
            </View>
          </View>
        )}

        {modes.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => {
              resetAll();
              setMode(m.id);
            }}
            activeOpacity={0.8}
            style={{
              backgroundColor: m.bg,
              borderRadius: 18,
              padding: 18,
              marginBottom: 12,
              borderWidth: 1.5,
              borderColor: m.color + "44",
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: m.color + "22",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
                {m.title}
              </Text>
              <Text
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  marginTop: 3,
                  lineHeight: 17,
                }}
              >
                {m.desc}
              </Text>
            </View>
            <Text style={{ color: m.color, fontSize: 22 }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ─── MODE SCREENS ─────────────────────────────────────────────────────────

  // Shared: back button
  const BackBtn = () => (
    <TouchableOpacity
      onPress={goMenu}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 16,
      }}
    >
      <Text style={{ color: "#64748b", fontSize: 16 }}>‹</Text>
      <Text style={{ color: "#64748b", fontSize: 13, fontWeight: "600" }}>
        Menü
      </Text>
    </TouchableOpacity>
  );

  // ── CLASSIC ───────────────────────────────────────────────────────────────
  if (mode === "classic") {
    const mainBg =
      phase === "waiting"
        ? "#ef4444"
        : phase === "ready"
          ? "#10b981"
          : phase === "tooEarly"
            ? "#f59e0b"
            : phase === "result" && reactionTime !== null
              ? RATING[getRating(reactionTime)].color
              : "#1e293b";

    const mainEmoji =
      phase === "waiting"
        ? "⏳"
        : phase === "ready"
          ? "⚡"
          : phase === "tooEarly"
            ? "😅"
            : phase === "result" && reactionTime !== null
              ? RATING[getRating(reactionTime)].emoji
              : "👆";

    const mainLabel =
      phase === "idle"
        ? "Dokunarak Başla"
        : phase === "waiting"
          ? "Bekle..."
          : phase === "ready"
            ? "ŞIMDI!!!"
            : phase === "tooEarly"
              ? "Çok erken!"
              : "Tekrar";

    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BackBtn />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>
            ⚡ Klasik Refleks
          </Text>
          <Animated.View style={{ transform: [{ scale: streakScale }] }}>
            {streak > 0 && (
              <View
                style={{
                  backgroundColor: "#f59e0b22",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "#f59e0b44",
                }}
              >
                <Text
                  style={{ color: "#f59e0b", fontSize: 13, fontWeight: "800" }}
                >
                  🔥 {streak}x
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Timer bar (waiting) */}
        {phase === "waiting" && (
          <View
            style={{
              height: 4,
              backgroundColor: "#ffffff10",
              borderRadius: 2,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                height: 4,
                backgroundColor: "#ef4444",
                borderRadius: 2,
                width: timerBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        )}

        {/* Main tap area */}
        <Animated.View
          style={{
            transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
          }}
        >
          <TouchableOpacity
            onPress={handleClassicPress}
            activeOpacity={0.9}
            style={{
              height: 220,
              borderRadius: 28,
              backgroundColor: mainBg + "22",
              borderWidth: 3,
              borderColor: mainBg + "88",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <PulseRing color={mainBg} active={phase === "ready"} />
            <Text style={{ fontSize: 72 }}>{mainEmoji}</Text>
            <Text
              style={{
                color: mainBg,
                fontSize: 22,
                fontWeight: "900",
                marginTop: 10,
                letterSpacing: 0.5,
              }}
            >
              {mainLabel}
            </Text>
            {phase === "result" && reactionTime !== null && (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ translateY: resultSlide }],
                  opacity: resultOpacity,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 36,
                    fontWeight: "900",
                    marginTop: 6,
                  }}
                >
                  {reactionTime} ms
                </Text>
                <Text
                  style={{
                    color: RATING[getRating(reactionTime)].color,
                    fontSize: 16,
                    fontWeight: "800",
                    marginTop: 4,
                  }}
                >
                  {RATING[getRating(reactionTime)].label}
                </Text>
              </Animated.View>
            )}
            {phase === "tooEarly" && (
              <Text
                style={{
                  color: "#f59e0b",
                  fontSize: 15,
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                Tekrar dene →
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        {best !== null && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f59e0b18",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#f59e0b33",
              }}
            >
              <Text
                style={{ color: "#f59e0b", fontSize: 10, fontWeight: "700" }}
              >
                👑 EN İYİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {best} ms
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#3b82f618",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#3b82f633",
              }}
            >
              <Text
                style={{ color: "#3b82f6", fontSize: 10, fontWeight: "700" }}
              >
                🔥 SERİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {streak}x / {bestStreak}x
              </Text>
            </View>
          </View>
        )}

        {/* History */}
        {history.length > 0 && (
          <View
            style={{
              marginTop: 12,
              backgroundColor: "#0f172a",
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          >
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              SON DENEMELER
            </Text>
            {history
              .slice()
              .reverse()
              .map((h, i) => {
                const r = RATING[h.rating];
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{ color: "#334155", fontSize: 12, width: 18 }}
                      >
                        #{history.length - i}
                      </Text>
                      <Text style={{ fontSize: 14 }}>{r.emoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <MiniBar
                        value={1000 - Math.min(h.time, 1000)}
                        max={1000}
                        color={r.color}
                      />
                    </View>
                    <Text
                      style={{
                        color: r.color,
                        fontSize: 14,
                        fontWeight: "800",
                        minWidth: 60,
                        textAlign: "right",
                      }}
                    >
                      {h.time} ms
                    </Text>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>
    );
  }

  // ── FOCUS MODE ────────────────────────────────────────────────────────────
  if (mode === "focus") {
    const showColor = phase === "ready" ? focusColor.bg : "#1e293b";
    const isTarget = focusColor.isTarget;

    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BackBtn />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>
            🎯 Konsantrasyon
          </Text>
          {focusStreak > 0 && (
            <Animated.View style={{ transform: [{ scale: streakScale }] }}>
              <View
                style={{
                  backgroundColor: "#10b98122",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "#10b98144",
                }}
              >
                <Text
                  style={{ color: "#10b981", fontSize: 13, fontWeight: "800" }}
                >
                  ✅ {focusStreak}x
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        <View
          style={{
            backgroundColor: "#0f172a",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "#1e293b",
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>
            KURAL
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
            Renk belirdiğinde →{" "}
            <Text style={{ color: "#10b981", fontWeight: "800" }}>
              SADECE YEŞİLDE
            </Text>{" "}
            bas. Diğer renklerde basma!
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TouchableOpacity
            onPress={handleFocusPress}
            activeOpacity={0.9}
            style={{
              height: 230,
              borderRadius: 28,
              backgroundColor: showColor + (phase === "ready" ? "33" : "18"),
              borderWidth: 3,
              borderColor: phase === "ready" ? showColor + "cc" : "#1e3a5f",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <PulseRing
              color={phase === "ready" ? showColor : "#1e293b"}
              active={phase === "ready" && isTarget}
            />

            {phase === "idle" && (
              <>
                <Text style={{ fontSize: 60 }}>🎯</Text>
                <Text
                  style={{
                    color: "#94a3b8",
                    fontSize: 18,
                    fontWeight: "700",
                    marginTop: 10,
                  }}
                >
                  Başlamak için dokun
                </Text>
              </>
            )}
            {phase === "waiting" && (
              <>
                <Text style={{ fontSize: 60 }}>👁️</Text>
                <Text
                  style={{
                    color: "#64748b",
                    fontSize: 18,
                    fontWeight: "700",
                    marginTop: 10,
                  }}
                >
                  Hazır ol...
                </Text>
              </>
            )}
            {phase === "ready" && (
              <>
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: focusColor.bg,
                    shadowColor: focusColor.bg,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 24,
                    elevation: 10,
                  }}
                />
                <Text
                  style={{
                    color: focusColor.bg,
                    fontSize: 20,
                    fontWeight: "900",
                    marginTop: 12,
                  }}
                >
                  {focusColor.label}
                </Text>
              </>
            )}
            {phase === "result" && (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ translateY: resultSlide }],
                  opacity: resultOpacity,
                }}
              >
                {focusFail ? (
                  <>
                    <Text style={{ fontSize: 60 }}>❌</Text>
                    <Text
                      style={{
                        color: "#ef4444",
                        fontSize: 22,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      Yanlış!
                    </Text>
                    <Text
                      style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}
                    >
                      Tekrar dene →
                    </Text>
                  </>
                ) : reactionTime !== null ? (
                  <>
                    <Text style={{ fontSize: 60 }}>✅</Text>
                    <Text
                      style={{
                        color: "#10b981",
                        fontSize: 22,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      {reactionTime} ms
                    </Text>
                    <Text
                      style={{
                        color: RATING[getRating(reactionTime)].color,
                        fontSize: 15,
                        fontWeight: "700",
                        marginTop: 4,
                      }}
                    >
                      {RATING[getRating(reactionTime)].label}
                    </Text>
                    <Text
                      style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}
                    >
                      Devam →
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 60 }}>😅</Text>
                    <Text
                      style={{
                        color: "#f59e0b",
                        fontSize: 18,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      Çok erken!
                    </Text>
                  </>
                )}
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {best !== null && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f59e0b18",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#f59e0b33",
              }}
            >
              <Text
                style={{ color: "#f59e0b", fontSize: 10, fontWeight: "700" }}
              >
                👑 EN İYİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {best} ms
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#10b98118",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#10b98133",
              }}
            >
              <Text
                style={{ color: "#10b981", fontSize: 10, fontWeight: "700" }}
              >
                ✅ DOĞRU SERİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {focusStreak}x
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── STROBE MODE ──────────────────────────────────────────────────────────
  if (mode === "strobe") {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BackBtn />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900" }}>
            🌀 Stroboskop
          </Text>
          {streak > 0 && (
            <Animated.View style={{ transform: [{ scale: streakScale }] }}>
              <View
                style={{
                  backgroundColor: "#a855f722",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: "#a855f744",
                }}
              >
                <Text
                  style={{ color: "#a855f7", fontSize: 13, fontWeight: "800" }}
                >
                  ⚡ {streak}x
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        <View
          style={{
            backgroundColor: "#0f172a",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "#1e293b",
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "#64748b", fontSize: 12, fontWeight: "600" }}>
            KURAL
          </Text>
          <Text style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
            Renkler hızla değişir.{" "}
            <Text style={{ color: "#10b981", fontWeight: "800" }}>YEŞİL</Text>{" "}
            sabit kalınca bas!
          </Text>
        </View>

        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <TouchableOpacity
            onPress={handleStrobePress}
            activeOpacity={0.9}
            style={{
              height: 230,
              borderRadius: 28,
              backgroundColor:
                phase === "waiting"
                  ? strobeColor + "40"
                  : phase === "ready"
                    ? "#10b98133"
                    : "#1e293b",
              borderWidth: 3,
              borderColor:
                phase === "waiting"
                  ? strobeColor + "aa"
                  : phase === "ready"
                    ? "#10b981cc"
                    : "#1e3a5f",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <PulseRing color="#10b981" active={strobeActive} />

            {phase === "idle" && (
              <>
                <Text style={{ fontSize: 60 }}>🌀</Text>
                <Text
                  style={{
                    color: "#94a3b8",
                    fontSize: 18,
                    fontWeight: "700",
                    marginTop: 10,
                  }}
                >
                  Başlamak için dokun
                </Text>
              </>
            )}
            {phase === "waiting" && (
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: strobeColor,
                  shadowColor: strobeColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 30,
                  elevation: 10,
                }}
              />
            )}
            {phase === "ready" && (
              <>
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: "#10b981",
                    shadowColor: "#10b981",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 30,
                    elevation: 10,
                  }}
                />
                <Text
                  style={{
                    color: "#10b981",
                    fontSize: 20,
                    fontWeight: "900",
                    marginTop: 14,
                  }}
                >
                  ŞIMDI!!!
                </Text>
              </>
            )}
            {(phase === "result" || phase === "tooEarly") && (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ translateY: resultSlide }],
                  opacity: resultOpacity,
                }}
              >
                {phase === "tooEarly" ? (
                  <>
                    <Text style={{ fontSize: 60 }}>😅</Text>
                    <Text
                      style={{
                        color: "#f59e0b",
                        fontSize: 22,
                        fontWeight: "900",
                        marginTop: 8,
                      }}
                    >
                      Çok erken!
                    </Text>
                    <Text
                      style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}
                    >
                      Tekrar →
                    </Text>
                  </>
                ) : reactionTime !== null ? (
                  <>
                    <Text
                      style={{
                        color: "#10b981",
                        fontSize: 40,
                        fontWeight: "900",
                      }}
                    >
                      {reactionTime} ms
                    </Text>
                    <Text
                      style={{
                        color: RATING[getRating(reactionTime)].color,
                        fontSize: 16,
                        fontWeight: "800",
                        marginTop: 4,
                      }}
                    >
                      {RATING[getRating(reactionTime)].label}
                    </Text>
                    <Text
                      style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}
                    >
                      Tekrar →
                    </Text>
                  </>
                ) : null}
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {best !== null && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "#f59e0b18",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#f59e0b33",
              }}
            >
              <Text
                style={{ color: "#f59e0b", fontSize: 10, fontWeight: "700" }}
              >
                👑 EN İYİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {best} ms
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "#a855f718",
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: "#a855f733",
              }}
            >
              <Text
                style={{ color: "#a855f7", fontSize: 10, fontWeight: "700" }}
              >
                ⚡ SERİ
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>
                {streak}x / {bestStreak}x
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── SERIES MODE ──────────────────────────────────────────────────────────
  if (mode === "series") {
    const avg =
      seriesScores.length > 0
        ? Math.round(
            seriesScores.reduce((a, b) => a + b, 0) / seriesScores.length,
          )
        : null;
    const mainBg =
      phase === "waiting"
        ? "#ef4444"
        : phase === "ready"
          ? "#10b981"
          : "#1e293b";

    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
      >
        <BackBtn />
        <Text
          style={{
            color: "#fff",
            fontSize: 20,
            fontWeight: "900",
            marginBottom: 14,
          }}
        >
          📊 Seri Analiz
        </Text>

        {/* Progress pills */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const done = i < seriesScores.length;
            const current = i === seriesIdx && !seriesDone;
            const score = seriesScores[i];
            return (
              <View key={i} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: done
                      ? RATING[getRating(score)].color + "33"
                      : current
                        ? "#3b82f633"
                        : "#0f172a",
                    borderWidth: 1.5,
                    borderColor: done
                      ? RATING[getRating(score)].color + "88"
                      : current
                        ? "#3b82f688"
                        : "#1e293b",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: done
                        ? RATING[getRating(score)].color
                        : current
                          ? "#3b82f6"
                          : "#334155",
                      fontSize: done ? 10 : 12,
                      fontWeight: "800",
                    }}
                  >
                    {done ? `${score}` : current ? "▶" : `${i + 1}`}
                  </Text>
                </View>
                {done && (
                  <MiniBar
                    value={1000 - Math.min(score, 1000)}
                    max={1000}
                    color={RATING[getRating(score)].color}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Timer bar */}
        {phase === "waiting" && (
          <View
            style={{
              height: 4,
              backgroundColor: "#ffffff10",
              borderRadius: 2,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            <Animated.View
              style={{
                height: 4,
                backgroundColor: "#ef4444",
                borderRadius: 2,
                width: timerBarAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        )}

        <Animated.View
          style={{
            transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
          }}
        >
          <TouchableOpacity
            onPress={handleSeriesPress}
            activeOpacity={0.9}
            style={{
              height: 200,
              borderRadius: 28,
              backgroundColor: mainBg + "22",
              borderWidth: 3,
              borderColor: mainBg + "88",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <PulseRing color={mainBg} active={phase === "ready"} />

            {phase === "idle" && (
              <>
                <Text style={{ fontSize: 60 }}>📊</Text>
                <Text
                  style={{
                    color: "#94a3b8",
                    fontSize: 18,
                    fontWeight: "700",
                    marginTop: 10,
                  }}
                >
                  Başlamak için dokun
                </Text>
              </>
            )}
            {phase === "waiting" && (
              <>
                <Text style={{ fontSize: 60 }}>⏳</Text>
                <Text
                  style={{
                    color: "#ef4444",
                    fontSize: 20,
                    fontWeight: "900",
                    marginTop: 10,
                  }}
                >
                  Bekle...
                </Text>
              </>
            )}
            {phase === "ready" && (
              <>
                <Text style={{ fontSize: 72 }}>⚡</Text>
                <Text
                  style={{
                    color: "#10b981",
                    fontSize: 24,
                    fontWeight: "900",
                    marginTop: 8,
                  }}
                >
                  ŞIMDI!!!
                </Text>
              </>
            )}
            {phase === "tooEarly" && (
              <>
                <Text style={{ fontSize: 60 }}>😅</Text>
                <Text
                  style={{
                    color: "#f59e0b",
                    fontSize: 18,
                    fontWeight: "900",
                    marginTop: 8,
                  }}
                >
                  Çok erken!
                </Text>
                <Text style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  Devam →
                </Text>
              </>
            )}
            {phase === "result" && !seriesDone && reactionTime !== null && (
              <Animated.View
                style={{
                  alignItems: "center",
                  transform: [{ translateY: resultSlide }],
                  opacity: resultOpacity,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 40, fontWeight: "900" }}
                >
                  {reactionTime} ms
                </Text>
                <Text
                  style={{
                    color: RATING[getRating(reactionTime)].color,
                    fontSize: 15,
                    fontWeight: "700",
                    marginTop: 4,
                  }}
                >
                  {RATING[getRating(reactionTime)].emoji}{" "}
                  {RATING[getRating(reactionTime)].label}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
                  Devam →
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Series done result */}
        {seriesDone && avg !== null && (
          <Animated.View
            style={{
              marginTop: 16,
              backgroundColor: "#0f172a",
              borderRadius: 20,
              padding: 20,
              borderWidth: 1.5,
              borderColor: RATING[getRating(avg)].color + "66",
            }}
          >
            <Text
              style={{
                color: "#94a3b8",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              SERİ TAMAMLANDI
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#64748b", fontSize: 10, fontWeight: "600" }}
                >
                  ORTALAMA
                </Text>
                <Text
                  style={{
                    color: RATING[getRating(avg)].color,
                    fontSize: 30,
                    fontWeight: "900",
                  }}
                >
                  {avg} ms
                </Text>
                <Text
                  style={{
                    color: RATING[getRating(avg)].color,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {RATING[getRating(avg)].emoji} {RATING[getRating(avg)].label}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: "#64748b", fontSize: 10, fontWeight: "600" }}
                >
                  EN İYİ
                </Text>
                <Text
                  style={{ color: "#f59e0b", fontSize: 30, fontWeight: "900" }}
                >
                  {Math.min(...seriesScores)} ms
                </Text>
                <Text style={{ color: "#64748b", fontSize: 11 }}>
                  EN KÖTÜ: {Math.max(...seriesScores)} ms
                </Text>
              </View>
            </View>

            {/* Bar chart */}
            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  color: "#64748b",
                  fontSize: 10,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                DENEMELER
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 6,
                  height: 60,
                }}
              >
                {seriesScores.map((s, i) => {
                  const maxS = Math.max(...seriesScores);
                  const h = Math.max((s / maxS) * 50, 8);
                  const r = RATING[getRating(s)];
                  return (
                    <View key={i} style={{ flex: 1, alignItems: "center" }}>
                      <Text
                        style={{
                          color: r.color,
                          fontSize: 8,
                          fontWeight: "700",
                          marginBottom: 2,
                        }}
                      >
                        {s}
                      </Text>
                      <View
                        style={{
                          width: "100%",
                          height: h,
                          backgroundColor: r.color + "44",
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: r.color + "88",
                        }}
                      />
                      <Text
                        style={{ color: "#334155", fontSize: 9, marginTop: 3 }}
                      >
                        #{i + 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSeriesPress}
              style={{
                marginTop: 16,
                backgroundColor: "#3b82f6",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>
                Tekrar Dene →
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    );
  }

  return null;
}
