import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";

interface Props {
  isDark: boolean;
  colors: any;
}

const WORK_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

const MODES = [
  { key: "work", label: "Çalışma", duration: WORK_DURATION },
  { key: "short", label: "Kısa", duration: SHORT_BREAK },
  { key: "long", label: "Uzun", duration: LONG_BREAK },
] as const;

type Mode = "work" | "short" | "long";

// ── Sadece saat kısmını memo ile izole ediyoruz
// Saniyede 1 render sadece bu bileşeni etkiler, üst ekranı yeniden çizmez
interface TimerDisplayProps {
  minutes: number;
  seconds: number;
  modeLabel: string;
  activeColor: string;
  isDark: boolean;
  textSecondary: string;
  pulseAnim: Animated.Value;
  glowAnim: Animated.Value;
}

const TimerDisplay = memo(function TimerDisplay({
  minutes,
  seconds,
  modeLabel,
  activeColor,
  isDark,
  textSecondary,
  pulseAnim,
  glowAnim,
}: TimerDisplayProps) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <Animated.View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
        transform: [{ scale: pulseAnim }],
      }}
    >
      {/* Glow halo */}
      <Animated.View
        style={{
          position: "absolute",
          width: 214,
          height: 214,
          borderRadius: 107,
          backgroundColor: activeColor,
          opacity: glowAnim.interpolate({
            inputRange: [0.45, 0.85],
            outputRange: [0.05, 0.14],
          }),
        }}
      />

      {/* Çember */}
      <View
        style={{
          width: 196,
          height: 196,
          borderRadius: 98,
          borderWidth: 4,
          borderColor: activeColor,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark ? activeColor + "07" : activeColor + "05",
          shadowColor: activeColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.65,
          shadowRadius: 20,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontSize: 50,
            fontWeight: "300",
            letterSpacing: 4,
            color: isDark ? activeColor : "#1a1a1a",
            ...(isDark
              ? {
                  textShadowColor: activeColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 12,
                }
              : {}),
          }}
        >
          {pad(minutes)}:{pad(seconds)}
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 9,
            letterSpacing: 3,
            fontWeight: "700",
            color: textSecondary,
          }}
        >
          {modeLabel}
        </Text>
      </View>
    </Animated.View>
  );
});

// ── Ana bileşen ───────────────────────────────────────────────────────────────
const PomodoroSection: React.FC<Props> = ({ isDark, colors }) => {
  const activeColor = isDark ? "#00E5FF" : "#2563eb";

  const [mode, setMode] = useState<Mode>("work");
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);

  const duration = MODES.find((m) => m.key === mode)!.duration;

  useEffect(() => {
    setSecondsLeft(duration);
    setIsRunning(false);
  }, [mode, duration]);

  // Geri sayım — sadece azaltır
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Süre bitişini ayrı effect ile yakala
  useEffect(() => {
    if (!isRunning || secondsLeft > 0) return;
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    const t = setTimeout(() => {
      setMode((m) => (m === "work" ? "short" : "work"));
    }, 400);
    return () => clearTimeout(t);
  }, [isRunning, secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = (duration - secondsLeft) / duration;

  const modeLabel =
    mode === "work"
      ? "ODAK ZAMANI"
      : mode === "short"
        ? "KISA MOLA"
        : "UZUN MOLA";

  // ── Başlat / Durdur + titreşim ─────────────────────────────────────────────
  const handleToggle = () => {
    Haptics.impactAsync(
      isRunning
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setSecondsLeft(duration);
  };

  // ── Pulse (çalışırken) ────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (isRunning) {
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseRef.current.start();
    } else {
      pulseRef.current?.stop();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRunning, pulseAnim]);

  // ── Glow ─────────────────────────────────────────────────────────────────
  const glowAnim = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.45,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [glowAnim]);

  // ── Progress bar animasyonu ───────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Gradyan renkleri
  const gradStart = isDark ? "rgba(22,22,22,0.98)" : "rgba(255,255,255,0.98)";
  const gradEnd = isDark ? "rgba(14,14,14,0.98)" : "rgba(245,247,250,0.98)";

  return (
    <View style={{ marginTop: 40, paddingHorizontal: 20, marginBottom: 16 }}>
      {/* Bölüm başlığı */}
      <View
        style={{
          borderLeftWidth: 3,
          borderLeftColor: activeColor,
          paddingLeft: 12,
          marginBottom: 24,
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 2,
            marginBottom: 2,
          }}
        >
          VERİMLİLİK
        </Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
          Pomodoro Zamanlayıcı
        </Text>
      </View>

      {/* Ana kart — LinearGradient ile derinlik */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          borderRadius: 28,
          borderWidth: 0.5,
          borderColor: isDark ? activeColor + "28" : "rgba(0,0,0,0.07)",
          shadowColor: activeColor,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.22 : 0.09,
          shadowRadius: 24,
          elevation: 10,
        }}
      >
        <View style={{ padding: 24 }}>
          {/* ── SEGMENTED CONTROL ── */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "#f0f2f5",
              borderRadius: 14,
              padding: 4,
              marginBottom: 32,
              borderWidth: 0.5,
              borderColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            {MODES.map((item) => {
              const active = mode === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMode(item.key);
                  }}
                  activeOpacity={0.75}
                  style={{
                    flex: 1,
                    paddingVertical: 9,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: active ? activeColor : "transparent",
                    shadowColor: active ? activeColor : "transparent",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: active ? 0.55 : 0,
                    shadowRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      letterSpacing: 0.3,
                      color: active
                        ? isDark
                          ? "#000"
                          : "#fff"
                        : colors.textSecondary,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── TIMER (memo ile izole) ── */}
          <TimerDisplay
            minutes={minutes}
            seconds={seconds}
            modeLabel={modeLabel}
            activeColor={activeColor}
            isDark={isDark}
            textSecondary={colors.textSecondary}
            pulseAnim={pulseAnim}
            glowAnim={glowAnim}
          />

          {/* ── PROGRESS BAR — kalın (h=10) + glow ── */}
          <View style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {Math.round(progress * 100)}% tamamlandı
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                {String(secondsLeft % 60).padStart(2, "0")} kaldı
              </Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: isDark
                  ? activeColor + "18"
                  : activeColor + "14",
                overflow: "hidden",
              }}
            >
              <Animated.View
                style={{
                  height: "100%",
                  borderRadius: 5,
                  backgroundColor: activeColor,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  shadowColor: activeColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              />
            </View>
          </View>

          {/* Mod bilgisi */}
          <View
            style={{
              marginBottom: 24,
              marginTop: 16,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              backgroundColor: isDark ? activeColor + "0D" : activeColor + "0A",
              borderWidth: 0.5,
              borderColor: activeColor + "30",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name={mode === "work" ? "flash" : "cafe"}
              size={13}
              color={activeColor}
            />
            <Text
              style={{ color: activeColor, fontSize: 11, fontWeight: "700" }}
            >
              {mode === "work"
                ? "25 dakika odak · Sonra kısa mola"
                : mode === "short"
                  ? "5 dakika dinlenme"
                  : "15 dakika uzun mola"}
            </Text>
          </View>

          {/* ── BUTONLAR ── */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Başlat / Durdur */}
            <TouchableOpacity
              onPress={handleToggle}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 15,
                borderRadius: 16,
                backgroundColor: activeColor,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.65,
                shadowRadius: 14,
                elevation: 6,
              }}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={17}
                color={isDark ? "#000" : "#fff"}
              />
              <Text
                style={{
                  fontWeight: "900",
                  color: isDark ? "#000" : "#fff",
                  fontSize: 14,
                  letterSpacing: 0.5,
                }}
              >
                {isRunning ? "DURDUR" : "BAŞLAT"}
              </Text>
            </TouchableOpacity>

            {/* Sıfırla — ikincil işlem */}
            <TouchableOpacity
              onPress={handleReset}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 15,
                borderRadius: 16,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f0f2f5",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 0.5,
                borderColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
              }}
            >
              <Ionicons name="refresh" size={17} color={colors.text} />
              <Text
                style={{
                  fontWeight: "800",
                  color: colors.text,
                  fontSize: 14,
                  letterSpacing: 0.5,
                }}
              >
                SIFIRLA
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default PomodoroSection;
