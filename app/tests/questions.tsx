// app/tests/questions.tsx

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../services/database";
import { playSound, preloadSounds } from "../../utils/soundManager";

// Android için LayoutAnimation'ı etkinleştir
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Tema Renkleri ───────────────────────────────────────────────────────────
const LightMode = {
  bg: "#f8f9fa",
  bgSecondary: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
  accent: "#2563eb",
  accentLight: "#dbeafe",
  correct: "#10b981",
  incorrect: "#ef4444",
  skeletonBase: "#e5e7eb",
  skeletonHighlight: "#f3f4f6",
  gradientFrom: "rgba(248,249,250,0)",
  gradientTo: "rgba(248,249,250,1)",
};

const DarkMode = {
  bg: "#0f0f0f",
  bgSecondary: "#1a1a1a",
  text: "#f9fafb",
  textSecondary: "#9ca3af",
  border: "#2a2a2a",
  accent: "#00E5FF",
  accentLight: "rgba(0, 229, 255, 0.1)",
  correct: "#10b981",
  incorrect: "#ef4444",
  skeletonBase: "#1a1a1a",
  skeletonHighlight: "#2a2a2a",
  gradientFrom: "rgba(15,15,15,0)",
  gradientTo: "rgba(15,15,15,1)",
};

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  testId: number;
  question: string;
  category: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
}

interface AnswerRecord {
  selectedAnswer: string;
  isCorrect: boolean;
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonLoader({ colors }: { colors: typeof LightMode }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]); // ✅ fixed: opacity eklendi

  const box = (w: string | number, h: number, r = 8, mb = 0) => (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: colors.skeletonBase,
        marginBottom: mb,
        opacity,
      }}
    />
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: 20,
        paddingTop: 60,
      }}
    >
      {/* header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        {box(28, 28, 14)}
        {box("50%", 18, 8)}
        {box(60, 28, 14)}
      </View>
      {/* progress */}
      {box("100%", 6, 3, 20)}
      {/* soru kartı */}
      {box("100%", 130, 16, 24)}
      {/* şıklar */}
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: "100%",
            height: 58,
            borderRadius: 12,
            backgroundColor: colors.skeletonBase,
            marginBottom: 10,
            opacity,
          }}
        />
      ))}
    </View>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function Questions(): ReactElement {
  useEffect(() => {
    preloadSounds();
  }, []);

  const router = useRouter();
  const { testId, testTitle } = useLocalSearchParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [answerMap, setAnswerMap] = useState<Record<number, AnswerRecord>>({});

  const correctCountRef = useRef(0);
  const wrongCountRef = useRef(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  // Seçenek animasyonu için
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const colors = theme?.isDark ? DarkMode : LightMode;

  const currentRecord = answerMap[currentQuestion] ?? null;
  const selectedAnswer = currentRecord?.selectedAnswer ?? null;
  const answered = currentRecord !== null;

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        await db.initialize();
        const questionsData = await db.getQuestionsByTest(Number(testId));
        setQuestions(questionsData);
        const progress = await db.getProgress(Number(testId));
        if (
          progress &&
          !progress.isCompleted &&
          progress.lastQuestionIndex > 0
        ) {
          setCurrentQuestion(progress.lastQuestionIndex);
          correctCountRef.current = progress.correctCount || 0;
          wrongCountRef.current = progress.wrongCount || 0;
          setCorrectCount(progress.correctCount || 0);
          setWrongCount(progress.wrongCount || 0);
        }
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, [testId]);

  // ── Seçenek listesi memoized ─────────────────────────────────────────────
  const question = questions[currentQuestion];

  const questionOptions = useMemo(() => {
    if (!question) return [];
    const parsed =
      typeof question.options === "string"
        ? JSON.parse(question.options)
        : question.options;
    return Object.entries(parsed).map(([key, value]) => ({
      id: key,
      text: value as string,
      correct: key === question.correctAnswer,
    }));
  }, [question]);

  // ── Sallama animasyonu (yanlış cevap) ────────────────────────────────────
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]); // ✅ fixed: shakeAnim eklendi

  // ── Pop animasyonu (doğru cevap) ─────────────────────────────────────────
  const triggerPop = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]); // ✅ fixed: scaleAnim eklendi

  // ── Cevap seçimi ─────────────────────────────────────────────────────────
  const handleSelectAnswer = async (optionId: string) => {
    if (answered) return;

    const isCorrect = optionId === question.correctAnswer;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (isCorrect) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
      playSound("correct");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerPop();
    } else {
      wrongCountRef.current += 1;
      setWrongCount(wrongCountRef.current);
      playSound("wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
    }

    setAnswerMap((prev) => ({
      ...prev,
      [currentQuestion]: { selectedAnswer: optionId, isCorrect },
    }));

    await db.saveProgress(
      Number(testId),
      currentQuestion,
      false,
      correctCountRef.current,
      wrongCountRef.current,
    );
  };

  // ── İleri ────────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      playSound("click");
      Haptics.selectionAsync();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const nextIndex = currentQuestion + 1;
      setCurrentQuestion(nextIndex);
      await db.saveProgress(
        Number(testId),
        nextIndex,
        false,
        correctCountRef.current,
        wrongCountRef.current,
      );
    }
  };

  // ── Geri ─────────────────────────────────────────────────────────────────
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      playSound("click");
      Haptics.selectionAsync();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // ── Soru paletinden seç ──────────────────────────────────────────────────
  const handleJumpToQuestion = (index: number) => {
    playSound("click");
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentQuestion(index);
  };

  // ── Bitir ─────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    await db.saveProgress(
      Number(testId),
      questions.length - 1,
      true,
      correctCountRef.current,
      wrongCountRef.current,
    );
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowResults(true);
  };

  // ─── Yükleniyor ──────────────────────────────────────────────────────────
  if (isLoading) return <SkeletonLoader colors={colors} />;

  if (questions.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.text }}>Soru bulunamadı.</Text>
      </View>
    );
  }

  // ─── Sonuç Ekranı ────────────────────────────────────────────────────────
  if (showResults) {
    const total = questions.length;
    const answeredCount = correctCountRef.current + wrongCountRef.current;
    const scorePercent =
      total > 0 ? Math.round((correctCountRef.current / total) * 100) : 0;
    const scoreColor =
      scorePercent >= 70
        ? colors.correct
        : scorePercent >= 40
          ? "#f59e0b"
          : colors.incorrect;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: 60,
            paddingHorizontal: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            TEST SONUCU
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "900",
              marginBottom: 32,
            }}
          >
            {testTitle}
          </Text>

          {/* Skor dairesi */}
          <View style={{ alignItems: "center", marginBottom: 36 }}>
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                borderWidth: 6,
                borderColor: scoreColor,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: colors.bgSecondary,
              }}
            >
              <Text
                style={{ color: scoreColor, fontSize: 48, fontWeight: "900" }}
              >
                %{scorePercent}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Başarı
              </Text>
            </View>
          </View>

          {/* Stat kartları */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {[
              {
                icon: "checkmark-circle",
                color: colors.correct,
                value: correctCountRef.current,
                label: "Doğru",
              },
              {
                icon: "close-circle",
                color: colors.incorrect,
                value: wrongCountRef.current,
                label: "Yanlış",
              },
              {
                icon: "remove-circle-outline",
                color: colors.textSecondary,
                value: total - answeredCount,
                label: "Boş",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgSecondary,
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: item.color + "55",
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={item.color}
                />
                <Text
                  style={{
                    color: item.color,
                    fontSize: 32,
                    fontWeight: "900",
                    marginTop: 8,
                  }}
                >
                  {item.value}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Net / Toplam / Başarı */}
          <View
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 32,
              flexDirection: "row",
              justifyContent: "space-around",
            }}
          >
            {[
              { label: "TOPLAM SORU", value: total, color: colors.text },
              {
                label: "NET",
                value: (
                  correctCountRef.current -
                  wrongCountRef.current / 4
                ).toFixed(2),
                color: scoreColor,
              },
              { label: "BAŞARI", value: `%${scorePercent}`, color: scoreColor },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && (
                  <View style={{ width: 1, backgroundColor: colors.border }} />
                )}
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={{
                      color: item.color,
                      fontSize: 24,
                      fontWeight: "900",
                      marginTop: 4,
                    }}
                  >
                    {item.value}
                  </Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => {
              playSound("click");
              router.back();
            }}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              Testlere Dön
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              playSound("click");
              await db.resetProgress(Number(testId));
              correctCountRef.current = 0;
              wrongCountRef.current = 0;
              setCorrectCount(0);
              setWrongCount(0);
              setCurrentQuestion(0);
              setAnswerMap({});
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setShowResults(false);
            }}
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}
            >
              Tekrar Çöz
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─── Soru Ekranı ─────────────────────────────────────────────────────────
  const isWrong = answered && selectedAnswer !== question.correctAnswer;
  const progressPercent = Math.round(
    ((currentQuestion + 1) / questions.length) * 100,
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 15,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.accent} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: "600",
              flex: 1,
              textAlign: "center",
            }}
            numberOfLines={1}
          >
            {testTitle}
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View
              style={{
                backgroundColor: colors.correct + "22",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: colors.correct,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                ✓ {correctCount}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.incorrect + "22",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 10,
              }}
            >
              <Text
                style={{
                  color: colors.incorrect,
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                ✗ {wrongCount}
              </Text>
            </View>
          </View>
        </View>

        {/* ── PROGRESS BAR ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
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
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {question.category.toUpperCase()}
            </Text>
            <Text
              style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}
            >
              {currentQuestion + 1} / {questions.length}
            </Text>
          </View>
          <View
            style={{
              height: 5,
              backgroundColor: colors.border,
              borderRadius: 3,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor: colors.accent,
                borderRadius: 3,
              }}
            />
          </View>

          {/* ── SORU PALETİ (yatay kaydırılabilir FlatList) ── */}
          <FlatList
            horizontal
            data={questions}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ gap: 4 }}
            renderItem={({ index }) => {
              const rec = answerMap[index];
              const isCurrent = index === currentQuestion;
              return (
                <TouchableOpacity
                  onPress={() => handleJumpToQuestion(index)}
                  style={{
                    minWidth: 28,
                    height: 28,
                    paddingHorizontal: 6,
                    borderRadius: 8,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isCurrent
                      ? colors.accent
                      : rec
                        ? rec.isCorrect
                          ? colors.correct
                          : colors.incorrect
                        : colors.bgSecondary,
                    borderWidth: 1,
                    borderColor: isCurrent
                      ? colors.accent
                      : rec
                        ? "transparent"
                        : colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: isCurrent || rec ? "#fff" : colors.textSecondary,
                    }}
                  >
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* ── SORU KARTI ── */}
        <Animated.View
          style={{
            marginHorizontal: 20,
            transform: [{ translateX: shakeAnim }, { scale: scaleAnim }],
          }}
        >
          <View
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 12,
              }}
            >
              SORU {currentQuestion + 1}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: "600",
                lineHeight: 26,
              }}
            >
              {question.question}
            </Text>
          </View>
        </Animated.View>

        {/* ── ŞIKLAR ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            ŞIKLAR
          </Text>

          {questionOptions.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const showCorrect = answered && option.correct;
            const showWrong = answered && isSelected && !option.correct;

            const borderColor = showCorrect
              ? colors.correct
              : showWrong
                ? colors.incorrect
                : isSelected
                  ? colors.accent
                  : colors.border;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleSelectAnswer(option.id)}
                disabled={answered}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  backgroundColor: showCorrect
                    ? colors.correct
                    : showWrong
                      ? colors.incorrect
                      : colors.bgSecondary,
                  borderRadius: 12,
                  marginBottom: 10,
                  borderWidth: showCorrect && !isSelected ? 2 : 1,
                  borderColor,
                  opacity:
                    answered && !isSelected && !option.correct ? 0.45 : 1,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor:
                      showCorrect || showWrong
                        ? "rgba(255,255,255,0.22)"
                        : colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 14,
                  }}
                >
                  <Text
                    style={{
                      color: showCorrect || showWrong ? "#fff" : colors.text,
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    {option.id}
                  </Text>
                </View>
                <Text
                  style={{
                    color: showCorrect || showWrong ? "#fff" : colors.text,
                    fontSize: 15,
                    fontWeight: "500",
                    flex: 1,
                    lineHeight: 22,
                  }}
                >
                  {option.text}
                </Text>
                {showCorrect && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                )}
                {showWrong && (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#fff"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── ÇÖZÜM BİLGİSİ — şıkların ALTINDA ── */}
        {answered && isWrong && question.explanation && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 8,
              flexDirection: "row",
              backgroundColor: theme?.isDark
                ? "rgba(239,68,68,0.1)"
                : "#fef2f2",
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.3)",
            }}
          >
            <Ionicons
              name="information-circle"
              size={22}
              color={colors.incorrect}
              style={{ marginRight: 10, marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.incorrect,
                  fontSize: 14,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Çözüm Bilgisi
              </Text>
              <Text
                style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}
              >
                {question.explanation}
              </Text>
            </View>
          </View>
        )}

        {/* Doğru cevap seçilince de kısa onay mesajı */}
        {answered && !isWrong && (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme?.isDark
                ? "rgba(16,185,129,0.1)"
                : "#f0fdf4",
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(16,185,129,0.3)",
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.correct}
              style={{ marginRight: 10 }}
            />
            <Text
              style={{ color: colors.correct, fontSize: 13, fontWeight: "600" }}
            >
              Doğru! Harika gidiyorsun.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── FOOTER ── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 12,
          flexDirection: "row",
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
          style={{
            flex: 1,
            height: 52,
            backgroundColor: colors.bgSecondary,
            borderRadius: 14,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 10,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: currentQuestion === 0 ? 0.35 : 1,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text
            style={{ color: colors.text, marginLeft: 8, fontWeight: "600" }}
          >
            Geri
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={
            currentQuestion === questions.length - 1 ? handleFinish : handleNext
          }
          style={{
            flex: 2,
            height: 52,
            backgroundColor:
              currentQuestion === questions.length - 1
                ? colors.correct
                : colors.accent,
            borderRadius: 14,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              marginRight: 8,
              fontWeight: "700",
              fontSize: 15,
            }}
          >
            {currentQuestion === questions.length - 1
              ? "Testi Bitir"
              : "Sonraki"}
          </Text>
          <Ionicons
            name={
              currentQuestion === questions.length - 1
                ? "checkmark-circle"
                : "arrow-forward"
            }
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
