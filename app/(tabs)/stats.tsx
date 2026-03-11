import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import {
  TrueFalseCard,
  trueFalseManager,
} from "../../services/TrueFalseManagement";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Tema ─────────────────────────────────────────────────────────────────────
const DarkMode = {
  bg: "#0A0A0C",
  bgCard: "rgba(18,18,22,0.98)",
  bgSurface: "rgba(26,26,30,0.95)",
  text: "#F0F2F8",
  textSecondary: "#52576A",
  border: "rgba(255,255,255,0.07)",
  accent: "#00E5FF",
  correct: "#10b981",
  incorrect: "#ef4444",
  warning: "#f59e0b",
};

const LightMode = {
  bg: "#F0F2F8",
  bgCard: "rgba(255,255,255,0.99)",
  bgSurface: "rgba(248,250,252,0.97)",
  text: "#0D1117",
  textSecondary: "#7C8494",
  border: "rgba(0,0,0,0.07)",
  accent: "#2563eb",
  correct: "#10b981",
  incorrect: "#ef4444",
  warning: "#f59e0b",
};

const SESSION_SIZE = 20;
const NEW_CARD_RATIO = 0.3;

function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function questionFontSize(text: string): number {
  if (text.length < 60) return 28;
  if (text.length < 120) return 22;
  return 17;
}

// ─── Streak Badge ─────────────────────────────────────────────────────────────
function StreakBadge({ streak, color }: { streak: number; color: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (streak === 0) return;
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 12,
      }),
    ]).start();
  }, [streak, scaleAnim]);

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: hexAlpha(color, 0.12),
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: hexAlpha(color, 0.25),
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Text style={{ fontSize: 13 }}>🔥</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "800" }}>{streak}</Text>
    </Animated.View>
  );
}

// ─── Segmented Progress ───────────────────────────────────────────────────────
function SegmentedProgress({
  total,
  current,
  correct,
  wrong,
  color,
}: {
  total: number;
  current: number;
  correct: number;
  wrong: number;
  color: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: total }).map((_, i) => {
        let bg: string;
        if (i < correct) bg = "#10b981";
        else if (i < correct + wrong) bg = "#ef4444";
        else if (i === current) bg = color;
        else bg = "rgba(255,255,255,0.10)";

        return (
          <Animated.View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: bg,
              opacity: i <= current ? 1 : 0.35,
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Answer Button ────────────────────────────────────────────────────────────
// Solid renkli, 3D alt gölge efektli, yatay ikon+metin
function AnswerButton({
  label,
  icon,
  color,
  bgColor,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const pressIn = () =>
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  const pressOut = () =>
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();

  // Basıldığında 3D efekti: aşağı iner
  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
      {/* 3D alt gölge katmanı */}
      <View
        style={{
          position: "absolute",
          bottom: -4,
          left: 0,
          right: 0,
          height: "100%",
          borderRadius: 18,
          backgroundColor: color,
          opacity: 0.5,
        }}
      />
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled}
        activeOpacity={1}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 12,
          borderRadius: 18,
          backgroundColor: bgColor,
          borderWidth: 2,
          borderColor: color,
          borderBottomWidth: 4,
          borderBottomColor: color,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
      >
        <Ionicons name={icon as any} size={22} color={color} />
        <Text
          style={{ color, fontSize: 15, fontWeight: "900", letterSpacing: 1 }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function Stats(): ReactElement {
  const theme = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [cards, setCards] = useState<TrueFalseCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bgFlashAnim = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState("#10b981");
  const cardEnterAnim = useRef(new Animated.Value(0)).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const cardShakeAnim = useRef(new Animated.Value(0)).current;

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const animateCardEnter = () => {
    cardEnterAnim.setValue(0);
    Animated.spring(cardEnterAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 8,
    }).start();
  };

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(cardShakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const loadSession = useCallback(async () => {
    setLoading(true);
    setSessionDone(false);
    setCurrentIndex(0);
    setAnswered(null);
    setIsCorrect(null);
    setSessionCorrect(0);
    setSessionWrong(0);
    setStreak(0);
    stopTimer();
    try {
      await trueFalseManager.initialize();
      const sessionCards = await trueFalseManager.getSessionCards(
        SESSION_SIZE,
        NEW_CARD_RATIO,
      );
      setCards(sessionCards);
    } catch (err) {
      console.error("Session yüklenemedi:", err);
      setCards([]);
    } finally {
      setLoading(false);
      startTimer();
      animateCardEnter();
    }
  }, []);

  useEffect(() => {
    loadSession();
    return () => stopTimer();
  }, [loadSession]);

  if (!theme) return <View style={{ flex: 1, backgroundColor: "#0A0A0C" }} />;

  const { isDark } = theme;
  const colors = isDark ? DarkMode : LightMode;

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 13,
            letterSpacing: 0.5,
          }}
        >
          Sorular hazırlanıyor...
        </Text>
      </View>
    );
  }

  // ─── No Cards ─────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          gap: 18,
        }}
      >
        <Text style={{ fontSize: 64 }}>🎉</Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 22,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Bugün için her şey tamam!
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          Tüm kartları tamamladın. Yarın yeni kartlar seni bekliyor.
        </Text>
        <TouchableOpacity
          onPress={loadSession}
          style={{
            marginTop: 8,
            paddingVertical: 14,
            paddingHorizontal: 32,
            backgroundColor: colors.accent,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              color: isDark ? "#000" : "#fff",
              fontWeight: "800",
              fontSize: 14,
            }}
          >
            Yenile
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[currentIndex];
  const isLastCard = currentIndex === cards.length - 1;

  // ─── Session Done ─────────────────────────────────────────────────────────
  if (sessionDone) {
    const total = sessionCorrect + sessionWrong;
    const rate = total > 0 ? Math.round((sessionCorrect / total) * 100) : 0;
    const emoji = rate >= 80 ? "🏆" : rate >= 60 ? "💪" : "📚";
    const title =
      rate >= 80
        ? "Efsanesin!"
        : rate >= 60
          ? "İyi iş çıkardın!"
          : "Pratik yaparsan gelişirsin!";

    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
            gap: 20,
          }}
        >
          <Text style={{ fontSize: 72 }}>{emoji}</Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "800",
              textAlign: "center",
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Text>

          {/* Skor kartı */}
          <View
            style={{
              width: "100%",
              borderRadius: 28,
              backgroundColor: colors.bgCard,
              borderWidth: 0.5,
              borderColor: colors.border,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0.2 : 0.1,
              shadowRadius: 24,
              elevation: 10,
              overflow: "hidden",
            }}
          >
            {/* Üst aksent */}
            <View style={{ height: 3, backgroundColor: colors.accent }} />
            <View
              style={{
                flexDirection: "row",
                paddingVertical: 28,
                paddingHorizontal: 16,
              }}
            >
              {[
                {
                  label: "DOĞRU",
                  value: String(sessionCorrect),
                  color: colors.correct,
                },
                {
                  label: "YANLIŞ",
                  value: String(sessionWrong),
                  color: colors.incorrect,
                },
                { label: "BAŞARI", value: `${rate}%`, color: colors.accent },
                {
                  label: "SÜRE",
                  value: formatTime(elapsed),
                  color: colors.text,
                },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 8,
                        fontWeight: "800",
                        letterSpacing: 1.5,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: item.color,
                        fontSize: 24,
                        fontWeight: "900",
                        letterSpacing: -0.5,
                      }}
                    >
                      {item.value}
                    </Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View
                      style={{
                        width: 0.5,
                        backgroundColor: colors.border,
                        marginVertical: 4,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {streak >= 3 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: hexAlpha(colors.warning, 0.12),
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: hexAlpha(colors.warning, 0.3),
              }}
            >
              <Text style={{ fontSize: 18 }}>🔥</Text>
              <Text
                style={{
                  color: colors.warning,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                En yüksek serin: {streak} ardışık doğru!
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: hexAlpha(colors.accent, isDark ? 0.08 : 0.06),
              padding: 14,
              borderRadius: 14,
              width: "100%",
              borderWidth: 0.5,
              borderColor: hexAlpha(colors.accent, 0.2),
            }}
          >
            <Text
              style={{
                color: hexAlpha(colors.accent, 0.8),
                fontSize: 12,
                textAlign: "center",
                lineHeight: 19,
              }}
            >
              Yanlış kartlar yarın tekrar gösterilecek.{"\n"}Doğrular öğrenme
              seviyene göre zamanlanacak.
            </Text>
          </View>

          <TouchableOpacity
            onPress={loadSession}
            style={{
              width: "100%",
              paddingVertical: 18,
              backgroundColor: colors.accent,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={isDark ? "#000" : "#fff"}
            />
            <Text
              style={{
                color: isDark ? "#000" : "#fff",
                fontSize: 15,
                fontWeight: "900",
                letterSpacing: 0.5,
              }}
            >
              YENİ TUR BAŞLAT
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Cevap handler ────────────────────────────────────────────────────────
  const handleAnswer = async (userAnswer: boolean) => {
    if (answered !== null) return;
    const correct = userAnswer === card.correctAnswer;

    setFlashColor(correct ? colors.correct : colors.incorrect);
    bgFlashAnim.setValue(1);
    Animated.timing(bgFlashAnim, {
      toValue: 0,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      shakeCard();
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswered(userAnswer);
    setIsCorrect(correct);

    if (correct) {
      setSessionCorrect((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setSessionWrong((c) => c + 1);
      setStreak(0);
    }

    Animated.spring(explanationAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();

    try {
      await trueFalseManager.answerCard(card.id, correct);
    } catch (err) {
      console.error("Cevap kaydedilemedi:", err);
    }
  };

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    if (isLastCard) {
      stopTimer();
      setSessionDone(true);
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    explanationAnim.setValue(0);
    setCurrentIndex((i) => i + 1);
    setAnswered(null);
    setIsCorrect(null);
    animateCardEnter();
  };

  const cardStatus = trueFalseManager.getCardStatus(card);
  const statusLabel =
    cardStatus === "new"
      ? "YENİ"
      : cardStatus === "mastered"
        ? "ÖĞRENİLDİ"
        : "ÖĞRENİLİYOR";
  const statusColor =
    cardStatus === "new"
      ? colors.accent
      : cardStatus === "mastered"
        ? colors.correct
        : colors.warning;

  const bgFlashColor = bgFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", hexAlpha(flashColor, isDark ? 0.09 : 0.06)],
  });

  const resultColor =
    answered !== null ? (isCorrect ? colors.correct : colors.incorrect) : null;

  return (
    <Animated.View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Arka plan renk patlaması */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bgFlashColor,
        }}
      />

      {/* ── HEADER ── */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Kapat butonu */}
        <TouchableOpacity
          onPress={stopTimer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Merkez: kart sayacı */}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: "800",
              letterSpacing: -0.3,
            }}
          >
            {currentIndex + 1}
            <Text style={{ color: colors.textSecondary, fontWeight: "500" }}>
              /{cards.length}
            </Text>
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1,
              marginTop: 1,
            }}
          >
            FLASHCARD
          </Text>
        </View>

        {/* Sağ: streak + süre */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <StreakBadge streak={streak} color={colors.warning} />
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.04)",
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <Ionicons
              name="time-outline"
              size={11}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 11,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatTime(elapsed)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── SEGMENTED PROGRESS ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <SegmentedProgress
          total={Math.min(cards.length, 20)}
          current={currentIndex}
          correct={sessionCorrect}
          wrong={sessionWrong}
          color={colors.accent}
        />
      </View>

      {/* ── FLASHCARD ── */}
      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          opacity: cardEnterAnim,
          transform: [
            {
              translateY: cardEnterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
            {
              scale: cardEnterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
            { translateX: cardShakeAnim },
          ],
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 32,
            backgroundColor: colors.bgCard,
            borderWidth: answered !== null ? 1.5 : 0.5,
            borderColor:
              answered !== null ? hexAlpha(resultColor!, 0.5) : colors.border,
            shadowColor: answered !== null ? resultColor! : colors.accent,
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: isDark ? (answered !== null ? 0.35 : 0.18) : 0.1,
            shadowRadius: 36,
            elevation: 18,
            overflow: "hidden",
          }}
        >
          {/* Üst renk çizgisi — cevap sonrası renk değişir */}
          <View
            style={{
              height: 3,
              backgroundColor: answered !== null ? resultColor! : colors.accent,
            }}
          />

          <View
            style={{ flex: 1, padding: 28, justifyContent: "space-between" }}
          >
            {/* Üst rozetler */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <View
                style={{
                  backgroundColor: hexAlpha(colors.accent, 0.1),
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 9,
                  borderWidth: 0.5,
                  borderColor: hexAlpha(colors.accent, 0.22),
                }}
              >
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 1.5,
                  }}
                >
                  {card.category.toUpperCase()}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: hexAlpha(statusColor, 0.1),
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 9,
                  borderWidth: 0.5,
                  borderColor: hexAlpha(statusColor, 0.22),
                }}
              >
                <Text
                  style={{
                    color: statusColor,
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 1.5,
                  }}
                >
                  {statusLabel}
                </Text>
              </View>
            </View>

            {/* Soru */}
            <View
              style={{ flex: 1, justifyContent: "center", paddingVertical: 20 }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: questionFontSize(card.question),
                  fontWeight: "700",
                  lineHeight: questionFontSize(card.question) * 1.48,
                  letterSpacing: -0.3,
                }}
              >
                {card.question}
              </Text>
            </View>

            {/* Alt bilgi */}
            {card.interval > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingTop: 14,
                  borderTopWidth: 0.5,
                  borderTopColor: colors.border,
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Son tekrardan {card.interval} gün geçti
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ── AÇIKLAMA PANELİ ── */}
      {answered !== null && (
        <Animated.View
          style={{
            marginHorizontal: 16,
            marginTop: 10,
            transform: [
              {
                translateY: explanationAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
            opacity: explanationAnim,
          }}
        >
          <View
            style={{
              borderRadius: 20,
              borderWidth: 1,
              borderColor: hexAlpha(resultColor!, 0.3),
              backgroundColor: hexAlpha(resultColor!, isDark ? 0.09 : 0.06),
              padding: 14,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "close-circle"}
              size={20}
              color={resultColor!}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: resultColor!,
                  fontSize: 13,
                  fontWeight: "800",
                  marginBottom: card.explanation ? 5 : 0,
                }}
              >
                {isCorrect
                  ? "Doğru Cevap!"
                  : `Yanlış — Doğrusu: ${card.correctAnswer ? "DOĞRU" : "YANLIŞ"}`}
              </Text>
              {card.explanation ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  💡 {card.explanation}
                </Text>
              ) : null}
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── BUTONLAR ── */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 16,
          gap: 10,
        }}
      >
        {answered === null ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <AnswerButton
              label="YANLIŞ"
              icon="close-circle"
              color="#ef4444"
              bgColor={isDark ? "rgba(239,68,68,0.10)" : "rgba(255,240,240,1)"}
              onPress={() => handleAnswer(false)}
              disabled={false}
            />
            <AnswerButton
              label="DOĞRU"
              icon="checkmark-circle"
              color="#10b981"
              bgColor={isDark ? "rgba(16,185,129,0.10)" : "rgba(236,253,245,1)"}
              onPress={() => handleAnswer(true)}
              disabled={false}
            />
          </View>
        ) : (
          /* Sonraki butonu — aynı 3D stil */
          <View>
            <View
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                right: 0,
                height: "100%",
                borderRadius: 18,
                backgroundColor: isDark
                  ? hexAlpha(colors.accent, 0.6)
                  : hexAlpha(colors.accent, 0.5),
              }}
            />
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.9}
              style={{
                paddingVertical: 16,
                borderRadius: 18,
                backgroundColor: colors.accent,
                borderBottomWidth: 4,
                borderBottomColor: isDark
                  ? hexAlpha(colors.accent, 0.5)
                  : hexAlpha(colors.accent, 0.7),
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#000" : "#fff",
                  fontSize: 16,
                  fontWeight: "900",
                  letterSpacing: 0.5,
                }}
              >
                {isLastCard ? "TURU BİTİR" : "SONRAKİ SORU"}
              </Text>
              <Ionicons
                name={isLastCard ? "trophy" : "arrow-forward"}
                size={20}
                color={isDark ? "#000" : "#fff"}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Mini skor satırı */}
        {answered !== null && (
          <View
            style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.correct}
              />
              <Text
                style={{
                  color: colors.correct,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {sessionCorrect}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons
                name="close-circle"
                size={14}
                color={colors.incorrect}
              />
              <Text
                style={{
                  color: colors.incorrect,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {sessionWrong}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Text style={{ fontSize: 12 }}>🔥</Text>
              <Text
                style={{
                  color: colors.warning,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                {streak}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
