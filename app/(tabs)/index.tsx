import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import PomodoroSection from "../../components/PomodoroSection";
import { ThemeContext } from "../../context/ThemeContext";
import { db, OverallStats } from "../../services/database";

const AnimatedView = Animated.createAnimatedComponent(View);

// ── HELPERS ────────────────────────────────────────────────────────────────
const haptic = (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) => {
  if (Platform.OS !== "web") Haptics.impactAsync(style);
};
const hapticSelection = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync();
};

// ── CIRCULAR PROGRESS (SVG, gradient, round-cap) ──────────────────────────
function CircularProgress({
  percent,
  size = 220,
  strokeWidth = 10,
  color,
  trackColor,
  children,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: percent,
      duration: 1200,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [percent, progressAnim]);

  const animatedOffset = circumference - (percent / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color + "99"} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ── SKELETON LOADING ──────────────────────────────────────────────────────
function DashboardSkeleton({
  isDark,
  insets,
}: {
  isDark: boolean;
  insets: any;
}) {
  const bgColor = isDark ? "#1a1a1a" : "#e5e7eb";
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? "#050505" : "#f2f4f8",
        paddingTop: insets.top,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 14,
          marginBottom: 40,
        }}
      >
        <MotiView
          from={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ loop: true, duration: 800, type: "timing" }}
          style={{
            width: 120,
            height: 30,
            borderRadius: 8,
            backgroundColor: bgColor,
          }}
        />
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: bgColor,
          }}
        />
      </View>
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <MotiView
          from={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ loop: true, duration: 1000, type: "timing" }}
          style={{
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: bgColor,
          }}
        />
      </View>
    </View>
  );
}

// ── GLASSMORPHISM KART ──────────────────────────────────────────────────────
function GlassCard({
  children,
  style,
  isDark,
  accentColor,
  glowActive = false,
  index = 0,
  onPress,
}: any) {
  const glowOpacity = glowActive
    ? accentColor
      ? 0.28
      : 0.12
    : isDark
      ? 0.15
      : 0.04;

  const CardInner = (
    <MotiView
      from={{ opacity: 0, translateY: 18, scale: 0.95 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "spring",
        delay: index * 50,
        damping: 18,
        stiffness: 120,
      }}
      style={[
        {
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 0.5,
          borderColor: isDark
            ? glowActive && accentColor
              ? accentColor + "40"
              : "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.06)",
          shadowColor: glowActive && accentColor ? accentColor : "#000",
          shadowOffset: { width: 0, height: glowActive ? 0 : 6 },
          shadowOpacity: glowOpacity,
          shadowRadius: glowActive ? 18 : 12,
          elevation: glowActive ? 10 : 3,
        },
        style,
      ]}
    >
      {/* Real blur on iOS, fallback on Android */}
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? "dark" : "light"}
          style={{ borderRadius: 24, overflow: "hidden" }}
        >
          <View
            style={{
              backgroundColor: isDark
                ? "rgba(18,18,18,0.55)"
                : "rgba(255,255,255,0.60)",
            }}
          >
            {children}
          </View>
        </BlurView>
      ) : (
        <View
          style={{
            backgroundColor: isDark
              ? "rgba(22, 22, 22, 0.92)"
              : "rgba(255,255,255,0.95)",
          }}
        >
          {children}
        </View>
      )}
    </MotiView>
  );

  if (onPress) {
    const scaleAnim = new Animated.Value(1);
    const handlePressIn = () =>
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
      }).start();
    const handlePressOut = () =>
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
      }).start();

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            haptic();
            onPress();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {CardInner}
        </Pressable>
      </Animated.View>
    );
  }

  return CardInner;
}

// ── PROGRESS BAR ────────────────────────────────────────────────────────────
function GlowProgressBar({ percent, color, trackColor, height = 8 }: any) {
  return (
    <View
      style={{
        height,
        backgroundColor: trackColor,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <MotiView
        from={{ width: "0%" }}
        animate={{ width: `${Math.min(100, percent)}%` }}
        transition={{ type: "timing", duration: 1000, delay: 200 }}
        style={{
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

// ── SECTION HEADING ─────────────────────────────────────────────────────────
function SectionHeading({
  overline,
  title,
  accentColor,
  textColor,
  secondaryColor,
}: any) {
  return (
    <View
      style={{
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        paddingLeft: 12,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: secondaryColor,
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 1.5,
          marginBottom: 2,
        }}
      >
        {overline}
      </Text>
      <Text style={{ color: textColor, fontSize: 18, fontWeight: "700" }}>
        {title}
      </Text>
    </View>
  );
}

// ── SUCCESS ICON (accessibility: color + icon) ───────────────────────────────
function SuccessIcon({
  successPercent,
  color,
}: {
  successPercent: number;
  color: string;
}) {
  const iconName =
    successPercent >= 70
      ? "checkmark-circle"
      : successPercent >= 40
        ? "alert-circle"
        : "arrow-down-circle";
  return (
    <Ionicons
      name={iconName as any}
      size={14}
      color={color}
      style={{ marginRight: 4 }}
    />
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Index(): ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OverallStats | null>(null);
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const loadStats = useCallback(async () => {
    try {
      await db.initialize();
      const data = await db.getOverallStats();
      setStats(data);
    } catch (e) {
      console.error("Veri yükleme hatası:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [glowAnim]);

  if (!theme) return <View />;
  const { isDark, setIsDark } = theme;

  const colors = {
    bg: isDark ? "#050505" : "#f8fafc",
    text: isDark ? "#ffffff" : "#0f172a",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    accent: isDark ? "#00E5FF" : "#2563eb",
    card: isDark ? "#121212" : "#ffffff",
    track: isDark ? "#1e1e2e" : "#e2e8f0",
  };

  if (isLoading) return <DashboardSkeleton isDark={isDark} insets={insets} />;

  const {
    overallProgress = 0,
    totalSolved = 0,
    successPercent = 0,
    completedTests = 0,
    totalTests = 0,
    subjectStats = [],
    dailyActivity = [],
  } = stats || {};

  const today = new Date().toISOString().split("T")[0];
  const todaySolved = dailyActivity.find((d) => d.date === today)?.count ?? 0;

  const successColor =
    successPercent >= 70
      ? "#10b981"
      : successPercent >= 40
        ? "#f59e0b"
        : "#ef4444";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 20, delay: 0 }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
          }}
        >
          {/* SOL TARAF: ICON + TEXT */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* ── GERÇEK UYGULAMA İKONU ── */}
            <Image
              source={require("../../assets/images/icon.png")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                marginRight: 12,
              }}
              resizeMode="cover"
            />
            {/* ─────────────────────────── */}

            <View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: -0.5,
                }}
              >
                KPSS Focus
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#22c55e",
                    marginRight: 6,
                  }}
                />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  ÇALIŞMA MODU
                </Text>
              </View>
            </View>
          </View>

          {/* SAĞ TARAF: TEMA BUTONU */}
          <TouchableOpacity
            onPress={() => {
              hapticSelection();
              setIsDark(!isDark);
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              borderWidth: 1.5,
              borderColor: colors.accent,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark
                ? "rgba(0,229,255,0.08)"
                : "rgba(37,99,235,0.08)",
            }}
          >
            <Ionicons
              name={isDark ? "sunny" : "moon"}
              size={20}
              color={colors.accent}
            />
          </TouchableOpacity>
        </View>
      </MotiView>

      {/* ANA İLERLEME — SVG Circular Progress */}
      <MotiView
        from={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 15, delay: 80 }}
        style={{ alignItems: "center", marginVertical: 30 }}
      >
        <AnimatedView
          style={{
            shadowColor: colors.accent,
            shadowOpacity: glowAnim,
            shadowRadius: glowAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [8, 22],
            }),
            borderRadius: 115,
          }}
        >
          <CircularProgress
            percent={overallProgress}
            size={220}
            strokeWidth={9}
            color={colors.accent}
            trackColor={isDark ? colors.accent + "18" : colors.accent + "12"}
          >
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 2,
                }}
              >
                TOPLAM VERİM
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 56, fontWeight: "800" }}
              >
                %{overallProgress}
              </Text>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {completedTests} / {totalTests} TEST
              </Text>
            </View>
          </CircularProgress>
        </AnimatedView>
      </MotiView>

      {/* STAT CARDS */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          gap: 12,
          marginBottom: 30,
        }}
      >
        {/* Çözüldü */}
        <GlassCard isDark={isDark} index={2} style={{ flex: 1 }}>
          <View
            style={{
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.2,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              ÇÖZÜLDÜ
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: "800",
                lineHeight: 28,
              }}
            >
              {totalSolved}
            </Text>
          </View>
        </GlassCard>

        {/* Bugün */}
        <GlassCard
          isDark={isDark}
          index={3}
          accentColor={colors.accent}
          glowActive
          style={{ flex: 1 }}
        >
          <View
            style={{
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.2,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              BUGÜN
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: "800",
                lineHeight: 28,
              }}
            >
              {todaySolved}
            </Text>
          </View>
        </GlassCard>

        {/* Başarı */}
        <GlassCard
          isDark={isDark}
          index={4}
          accentColor={successColor}
          glowActive={totalSolved > 0}
          style={{ flex: 1 }}
        >
          <View
            style={{
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.2,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              BAŞARI
            </Text>
            {totalSolved > 0 ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <SuccessIcon
                  successPercent={successPercent}
                  color={successColor}
                />
                <Text
                  style={{
                    color: successColor,
                    fontSize: 22,
                    fontWeight: "800",
                    lineHeight: 28,
                  }}
                >
                  %{successPercent}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 26,
                  fontWeight: "800",
                  lineHeight: 28,
                }}
              >
                —
              </Text>
            )}
          </View>
        </GlassCard>
      </View>

      {/* KONU ANALİZİ */}
      <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
        <SectionHeading
          overline="DETAYLI ANALİZ"
          title="Konu Performansı"
          accentColor={colors.accent}
          textColor={colors.text}
          secondaryColor={colors.textSecondary}
        />

        {subjectStats.length === 0 ? (
          <GlassCard
            isDark={isDark}
            index={5}
            accentColor={colors.accent}
            style={{ padding: 30, alignItems: "center" }}
          >
            <MotiView
              from={{ translateY: 0 }}
              animate={{ translateY: -6 }}
              transition={{
                loop: true,
                type: "timing",
                duration: 1800,
                repeatReverse: true,
              }}
              style={{ marginBottom: 18 }}
            >
              <Ionicons name="rocket" size={52} color={colors.accent} />
            </MotiView>
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: "700",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Hazır Mısın?
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: "500",
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
              }}
            >
              İlk testini çözdüğünde burada konu bazlı{"\n"}başarı analizlerini
              göreceksin.
            </Text>
            <TouchableOpacity
              onPress={() => {
                haptic(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/tests" as any);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="İlk testine başla"
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.accent,
                paddingHorizontal: 28,
                paddingVertical: 13,
                borderRadius: 14,
                shadowColor: colors.accent,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#000" : "#fff",
                  fontWeight: "800",
                  fontSize: 14,
                  letterSpacing: 0.3,
                }}
              >
                Hemen İlk Testine Başla 🚀
              </Text>
            </TouchableOpacity>
          </GlassCard>
        ) : (
          subjectStats.map((subject, idx) => (
            <MotiView
              key={subject.subjectId}
              from={{ opacity: 0, translateX: -16 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "spring", delay: idx * 80, damping: 18 }}
              style={{ marginBottom: 12 }}
            >
              <View
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: isDark ? "rgba(22,22,26,0.95)" : "#fff",
                  borderWidth: 0.5,
                  borderColor: isDark
                    ? subject.color + "30"
                    : subject.color + "20",
                  shadowColor: subject.color,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.2 : 0.08,
                  shadowRadius: 12,
                  elevation: 4,
                }}
              >
                {/* Sol renk çizgisi */}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: subject.color,
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                  }}
                />

                <View style={{ padding: 16, paddingLeft: 20 }}>
                  {/* Üst satır: başlık + yüzde */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {/* Renkli ikon kutusu */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 11,
                          backgroundColor:
                            subject.color + (isDark ? "22" : "15"),
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: subject.color + "35",
                        }}
                      >
                        <Ionicons
                          name={
                            subject.title.toLowerCase().includes("tarih")
                              ? "time-outline"
                              : subject.title.toLowerCase().includes("coğrafya")
                                ? "earth-outline"
                                : subject.title
                                      .toLowerCase()
                                      .includes("vatandaşlık")
                                  ? "flag-outline"
                                  : subject.title
                                        .toLowerCase()
                                        .includes("güncel")
                                    ? "newspaper-outline"
                                    : "book-outline"
                          }
                          size={18}
                          color={subject.color}
                        />
                      </View>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 14,
                          fontWeight: "700",
                          letterSpacing: -0.2,
                        }}
                      >
                        {subject.title}
                      </Text>
                    </View>

                    {/* Yüzde + ikon */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: subject.color + (isDark ? "18" : "10"),
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 10,
                        borderWidth: 0.5,
                        borderColor: subject.color + "35",
                      }}
                    >
                      <SuccessIcon
                        successPercent={subject.progressPercent}
                        color={subject.color}
                      />
                      <Text
                        style={{
                          color: subject.color,
                          fontSize: 14,
                          fontWeight: "800",
                        }}
                      >
                        %{subject.progressPercent}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: isDark
                        ? subject.color + "18"
                        : subject.color + "12",
                      overflow: "visible",
                    }}
                  >
                    <MotiView
                      from={{ width: "0%" }}
                      animate={{
                        width: `${Math.min(100, subject.progressPercent)}%`,
                      }}
                      transition={{
                        type: "timing",
                        duration: 1000,
                        delay: idx * 80 + 200,
                      }}
                      style={{
                        height: "100%",
                        backgroundColor: subject.color,
                        borderRadius: 3,
                      }}
                    >
                      {/* Parlayan uç */}
                      {subject.progressPercent > 2 &&
                        subject.progressPercent < 100 && (
                          <View
                            style={{
                              position: "absolute",
                              right: -3,
                              top: -3,
                              width: 12,
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: subject.color,
                              shadowColor: subject.color,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 1,
                              shadowRadius: 8,
                            }}
                          />
                        )}
                    </MotiView>
                  </View>

                  {/* Alt satır: D/Y istatistikleri */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 10,
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#10b981",
                        }}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 10,
                          fontWeight: "600",
                        }}
                      >
                        {subject.correctCount ?? 0} Doğru
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#ef4444",
                        }}
                      />
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 10,
                          fontWeight: "600",
                        }}
                      >
                        {subject.wrongCount ?? 0} Yanlış
                      </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {subject.completedTests ?? 0}/{subject.totalTests ?? 0}{" "}
                      test
                    </Text>
                  </View>
                </View>
              </View>
            </MotiView>
          ))
        )}
      </View>

      <KpssCountdown isDark={isDark} colors={colors} />
      <PomodoroSection isDark={isDark} colors={colors} />
      <KpssCalculatorButton isDark={isDark} colors={colors} />
    </ScrollView>
  );
}

// ── KPSS PUAN HESAPLAMA ────────────────────────────────────────────────────
function KpssCalculatorButton({ isDark, colors }: any) {
  const [visible, setVisible] = useState(false);

  const [fields, setFields] = useState({
    turkce: { d: "", y: "", label: "Türkçe", total: 20 },
    tarih: { d: "", y: "", label: "Tarih", total: 10 },
    cografya: { d: "", y: "", label: "Coğrafya", total: 6 },
    vatandaslik: { d: "", y: "", label: "Vatandaşlık", total: 6 },
    guncel: { d: "", y: "", label: "Güncel Bilgiler", total: 8 },
    matematik: { d: "", y: "", label: "Matematik", total: 30 },
  });

  const slideAnim = useRef(new Animated.Value(600)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const openModal = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
    haptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start(() => setVisible(false));
  };

  const update = (key: string, field: "d" | "y", val: string) => {
    const num = val.replace(/[^0-9]/g, "");
    setFields((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], [field]: num },
    }));
  };

  const calcNet = (d: string, y: string) => {
    const correct = parseFloat(d) || 0;
    const wrong = parseFloat(y) || 0;
    return Math.max(0, correct - wrong / 4);
  };

  const totalNet = Object.entries(fields).reduce(
    (sum, [, f]: any) => sum + calcNet(f.d, f.y),
    0,
  );

  const hamPuan = (totalNet / 80) * 100;
  const kpssPuan = Math.min(100, hamPuan * 1.5 + 40).toFixed(2);

  const resultColor =
    parseFloat(kpssPuan) >= 70
      ? "#10b981"
      : parseFloat(kpssPuan) >= 55
        ? "#f59e0b"
        : "#ef4444";

  const bgOverlay = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"],
  });

  return (
    <>
      {/* ── BUTONU ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.85}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, delay: 200 }}
          >
            <View
              style={{
                backgroundColor: isDark ? "rgba(22,22,26,0.95)" : "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isDark
                  ? colors.accent + "35"
                  : colors.accent + "25",
                paddingVertical: 18,
                paddingHorizontal: 22,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: colors.accent + "18",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.accent + "30",
                  }}
                >
                  <Ionicons name="calculator" size={22} color={colors.accent} />
                </View>
                <View>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "800",
                      letterSpacing: -0.2,
                    }}
                  >
                    Puan Hesapla
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      fontWeight: "500",
                      marginTop: 2,
                    }}
                  >
                    KPSS-P3 tahmini puanın
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: colors.accent + "15",
                  borderRadius: 10,
                  padding: 8,
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.accent}
                />
              </View>
            </View>
          </MotiView>
        </TouchableOpacity>
      </View>

      {/* ── MODAL ── */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: bgOverlay,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={closeModal}
          />

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <View
              style={{
                backgroundColor: isDark ? "#0f0f12" : "#f8fafc",
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderWidth: 0.5,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                maxHeight: "92%",
              }}
            >
              {/* Handle */}
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 14,
                  paddingBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(0,0,0,0.12)",
                  }}
                />
              </View>

              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 22,
                  paddingBottom: 16,
                  paddingTop: 8,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 2,
                      marginBottom: 3,
                    }}
                  >
                    TAHMİNİ HESAPLAMA
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: "800",
                    }}
                  >
                    KPSS Puan Hesapla
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.05)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ paddingHorizontal: 22 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Ders girişleri */}
                {Object.entries(fields).map(([key, f]: any) => {
                  const net = calcNet(f.d, f.y);
                  return (
                    <View
                      key={key}
                      style={{
                        marginBottom: 12,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "#fff",
                        borderRadius: 16,
                        borderWidth: 0.5,
                        borderColor: isDark
                          ? "rgba(255,255,255,0.07)"
                          : "rgba(0,0,0,0.06)",
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {f.label}
                        </Text>
                        <Text
                          style={{
                            color: net > 0 ? "#10b981" : colors.textSecondary,
                            fontSize: 12,
                            fontWeight: "800",
                          }}
                        >
                          Net: {net.toFixed(2)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        {/* Doğru */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: "#10b981",
                              fontSize: 9,
                              fontWeight: "800",
                              letterSpacing: 1,
                              marginBottom: 6,
                            }}
                          >
                            DOĞRU
                          </Text>
                          <View
                            style={{
                              backgroundColor: isDark
                                ? "rgba(16,185,129,0.08)"
                                : "rgba(16,185,129,0.06)",
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "rgba(16,185,129,0.25)",
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                            }}
                          >
                            <TextInputField
                              value={f.d}
                              onChangeText={(v: string) => update(key, "d", v)}
                              max={f.total}
                              color="#10b981"
                              isDark={isDark}
                            />
                          </View>
                        </View>
                        {/* Yanlış */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: "#ef4444",
                              fontSize: 9,
                              fontWeight: "800",
                              letterSpacing: 1,
                              marginBottom: 6,
                            }}
                          >
                            YANLIŞ
                          </Text>
                          <View
                            style={{
                              backgroundColor: isDark
                                ? "rgba(239,68,68,0.08)"
                                : "rgba(239,68,68,0.06)",
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: "rgba(239,68,68,0.25)",
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                            }}
                          >
                            <TextInputField
                              value={f.y}
                              onChangeText={(v: string) => update(key, "y", v)}
                              max={f.total}
                              color="#ef4444"
                              isDark={isDark}
                            />
                          </View>
                        </View>
                        {/* Boş (otomatik) */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 9,
                              fontWeight: "800",
                              letterSpacing: 1,
                              marginBottom: 6,
                            }}
                          >
                            BOŞ
                          </Text>
                          <View
                            style={{
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(0,0,0,0.03)",
                              borderRadius: 10,
                              borderWidth: 0.5,
                              borderColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.06)",
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontSize: 15,
                                fontWeight: "700",
                              }}
                            >
                              {Math.max(
                                0,
                                f.total -
                                  (parseInt(f.d) || 0) -
                                  (parseInt(f.y) || 0),
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Sonuç kartı */}
                <View
                  style={{
                    marginTop: 4,
                    marginBottom: 40,
                    backgroundColor: isDark ? "rgba(22,22,26,0.95)" : "#fff",
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: resultColor + "40",
                    overflow: "hidden",
                    shadowColor: resultColor,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <View style={{ height: 3, backgroundColor: resultColor }} />
                  <View style={{ padding: 22, alignItems: "center", gap: 6 }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 9,
                        fontWeight: "800",
                        letterSpacing: 2,
                      }}
                    >
                      TAHMİNİ KPSS-P3 PUANI
                    </Text>
                    <Text
                      style={{
                        color: resultColor,
                        fontSize: 52,
                        fontWeight: "800",
                        letterSpacing: -2,
                      }}
                    >
                      {kpssPuan}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 11,
                        fontWeight: "500",
                      }}
                    >
                      Toplam net: {totalNet.toFixed(2)} / 80
                    </Text>
                    <View
                      style={{
                        marginTop: 8,
                        backgroundColor: resultColor + "15",
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 10,
                        borderWidth: 0.5,
                        borderColor: resultColor + "30",
                      }}
                    >
                      <Text
                        style={{
                          color: resultColor,
                          fontSize: 11,
                          fontWeight: "700",
                          textAlign: "center",
                        }}
                      >
                        {parseFloat(kpssPuan) >= 70
                          ? "🏆 Güçlü bir performans!"
                          : parseFloat(kpssPuan) >= 55
                            ? "💪 İyi gidiyorsun, devam et!"
                            : "📚 Daha fazla çalışman gerekiyor"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 10,
                        textAlign: "center",
                        marginTop: 8,
                        lineHeight: 15,
                        opacity: 0.7,
                      }}
                    >
                      * Bu hesaplama tahminidir. Gerçek KPSS puanı{"\n"}ÖSYM'nin
                      ağırlıklı formülüne göre değişebilir.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

// Sayısal input bileşeni
function TextInputField({ value, onChangeText, max, color, isDark }: any) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      maxLength={2}
      placeholder="0"
      placeholderTextColor={
        isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"
      }
      style={{
        color,
        fontSize: 18,
        fontWeight: "800",
        textAlign: "center",
        padding: 0,
        fontVariant: ["tabular-nums"],
      }}
    />
  );
}

function KpssCountdown({ isDark, colors }: any) {
  const EXAM_DATE = useMemo(() => new Date("2026-09-06T10:15:00"), []);

  const calcRemaining = useCallback(() => {
    const now = new Date();
    const diff = Math.max(0, EXAM_DATE.getTime() - now.getTime());
    const total = Math.floor(diff / 1000);
    return {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  }, [EXAM_DATE]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const t = setInterval(() => setRemaining(calcRemaining()), 1000);
    return () => clearInterval(t);
  }, [calcRemaining]);

  const urgencyColor =
    remaining.days <= 30
      ? "#ef4444"
      : remaining.days <= 90
        ? "#f59e0b"
        : colors.accent;

  const examDateStr = "6 Eylül 2026 · 10:15";

  const units = [
    { v: remaining.days, l: "GÜN", accent: true },
    { v: remaining.hours, l: "SAAT", accent: false },
    { v: remaining.minutes, l: "DAKİKA", accent: false },
    { v: remaining.seconds, l: "SANİYE", accent: false },
  ];

  const TOTAL_DAYS = 365;
  const progressPct = Math.max(
    0,
    Math.min(100, ((TOTAL_DAYS - remaining.days) / TOTAL_DAYS) * 100),
  );

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
      <SectionHeading
        overline="SINAV TAKVİMİ"
        title="KPSS'ye Ne Kadar Kaldı?"
        accentColor={urgencyColor}
        textColor={colors.text}
        secondaryColor={colors.textSecondary}
      />

      <GlassCard
        isDark={isDark}
        accentColor={urgencyColor}
        glowActive
        index={10}
        style={{}}
      >
        <View style={{ padding: 20 }}>
          {/* Sınav tarihi etiketi */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={13}
              color={urgencyColor}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: urgencyColor,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {examDateStr}
            </Text>
          </View>

          {/* 4 zaman birimi — pill kartlar */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {units.map((item, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: item.accent
                    ? urgencyColor + (isDark ? "22" : "18")
                    : isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                  borderRadius: 16,
                  borderWidth: item.accent ? 1 : 0.5,
                  borderColor: item.accent
                    ? urgencyColor + "55"
                    : isDark
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: i === 0 ? 30 : 24,
                    fontWeight: "800",
                    color: item.accent ? urgencyColor : colors.text,
                    fontVariant: ["tabular-nums"],
                    letterSpacing: -1,
                    lineHeight: i === 0 ? 34 : 28,
                  }}
                >
                  {String(item.v).padStart(2, "0")}
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "700",
                    color: item.accent
                      ? urgencyColor + "cc"
                      : colors.textSecondary,
                    marginTop: 6,
                    letterSpacing: 0.8,
                  }}
                >
                  {item.l}
                </Text>
              </View>
            ))}
          </View>

          {/* İlerleme çubuğu */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                }}
              >
                SINAVIN TAMAMLANAN SÜRESİ
              </Text>
              <Text
                style={{ color: urgencyColor, fontSize: 9, fontWeight: "800" }}
              >
                %{Math.round(progressPct)}
              </Text>
            </View>
            <View
              style={{
                height: 5,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.06)",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <MotiView
                from={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "timing", duration: 1200, delay: 400 }}
                style={{
                  height: "100%",
                  backgroundColor: urgencyColor,
                  borderRadius: 3,
                  opacity: 0.85,
                }}
              />
            </View>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}
