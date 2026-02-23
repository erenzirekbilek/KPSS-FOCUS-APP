// app/tests/questions.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  ReactElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../services/database";

const LightMode = {
  bg: "#f8f9fa",
  bgSecondary: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#555",
  border: "#e5e7eb",
  accent: "#2563eb",
  accentLight: "#dbeafe",
  correct: "#10b981",
  incorrect: "#ef4444",
};

const DarkMode = {
  bg: "#000000",
  bgSecondary: "#121212",
  text: "#ffffff",
  textSecondary: "#888",
  border: "#1c1c1c",
  accent: "#00E5FF",
  accentLight: "rgba(0, 229, 255, 0.1)",
  correct: "#10b981",
  incorrect: "#ef4444",
};

interface Question {
  id: number;
  testId: number;
  question: string;
  category: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation?: string;
}

export default function Questions(): ReactElement {
  const router = useRouter();
  const { testId, testTitle } = useLocalSearchParams();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Doğru / yanlış sayaçları — ref kullanıyoruz ki async içinde stale closure olmadan erişebilelim
  const correctCountRef = useRef(0);
  const wrongCountRef = useRef(0);
  // UI güncellemesi için state versiyonları
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const colors = theme?.isDark ? DarkMode : LightMode;

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        await db.initialize();
        const questionsData = await db.getQuestionsByTest(Number(testId));
        setQuestions(questionsData);

        // Daha önce kaldığı yerden devam et (tamamlanmamışsa)
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

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

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

  // ===================== SONUÇ EKRANI =====================
  if (showResults) {
    const total = questions.length;
    const answered_ = correctCountRef.current + wrongCountRef.current;
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
          {/* Başlık */}
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

          {/* Büyük skor dairesi */}
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

          {/* İstatistik kartları */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {/* Doğru */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bgSecondary,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.correct + "55",
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={colors.correct}
              />
              <Text
                style={{
                  color: colors.correct,
                  fontSize: 32,
                  fontWeight: "900",
                  marginTop: 8,
                }}
              >
                {correctCountRef.current}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Doğru
              </Text>
            </View>

            {/* Yanlış */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bgSecondary,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.incorrect + "55",
              }}
            >
              <Ionicons
                name="close-circle"
                size={32}
                color={colors.incorrect}
              />
              <Text
                style={{
                  color: colors.incorrect,
                  fontSize: 32,
                  fontWeight: "900",
                  marginTop: 8,
                }}
              >
                {wrongCountRef.current}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Yanlış
              </Text>
            </View>

            {/* Boş */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bgSecondary,
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons
                name="remove-circle-outline"
                size={32}
                color={colors.textSecondary}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 32,
                  fontWeight: "900",
                  marginTop: 8,
                }}
              >
                {total - answered_}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Boş
              </Text>
            </View>
          </View>

          {/* Net bilgisi */}
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
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                TOPLAM SORU
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {total}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                NET
              </Text>
              <Text
                style={{
                  color: scoreColor,
                  fontSize: 24,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {(correctCountRef.current - wrongCountRef.current / 4).toFixed(
                  2,
                )}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                }}
              >
                BAŞARI
              </Text>
              <Text
                style={{
                  color: scoreColor,
                  fontSize: 24,
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                %{scorePercent}
              </Text>
            </View>
          </View>

          {/* Butonlar */}
          <TouchableOpacity
            onPress={() => router.back()}
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
              // Sıfırla ve baştan başla
              await db.resetProgress(Number(testId));
              correctCountRef.current = 0;
              wrongCountRef.current = 0;
              setCorrectCount(0);
              setWrongCount(0);
              setCurrentQuestion(0);
              setSelectedAnswer(null);
              setAnswered(false);
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

  // ===================== SORU EKRANI =====================
  const question = questions[currentQuestion];

  const parsedOptions =
    typeof question.options === "string"
      ? JSON.parse(question.options)
      : question.options;

  const questionOptions = Object.entries(parsedOptions).map(([key, value]) => ({
    id: key,
    text: value as string,
    correct: key === question.correctAnswer,
  }));

  const handleSelectAnswer = async (optionId: string) => {
    if (answered) return;

    const isCorrect = optionId === question.correctAnswer;

    if (isCorrect) {
      correctCountRef.current += 1;
      setCorrectCount(correctCountRef.current);
    } else {
      wrongCountRef.current += 1;
      setWrongCount(wrongCountRef.current);
    }

    setSelectedAnswer(optionId);
    setAnswered(true);

    // Her cevaplandığında anlık kaydet
    await db.saveProgress(
      Number(testId),
      currentQuestion,
      false,
      correctCountRef.current,
      wrongCountRef.current,
    );
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      const nextIndex = currentQuestion + 1;
      setCurrentQuestion(nextIndex);
      setSelectedAnswer(null);
      setAnswered(false);
      // Bir sonraki soruya geçişi kaydet
      await db.saveProgress(
        Number(testId),
        nextIndex,
        false,
        correctCountRef.current,
        wrongCountRef.current,
      );
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  const handleFinish = async () => {
    // Testi tamamlandı olarak kaydet
    await db.saveProgress(
      Number(testId),
      questions.length - 1,
      true,
      correctCountRef.current,
      wrongCountRef.current,
    );
    setShowResults(true);
  };

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
        {/* --- HEADER --- */}
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
          {/* Canlı D/Y sayacı */}
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

        {/* --- PROGRESS BAR --- */}
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
              height: 4,
              backgroundColor: colors.border,
              borderRadius: 2,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor: colors.accent,
                borderRadius: 2,
              }}
            />
          </View>
        </View>

        {/* --- QUESTION CARD --- */}
        <View
          style={{
            marginHorizontal: 20,
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
              marginBottom: answered && isWrong ? 15 : 5,
            }}
          >
            {question.question}
          </Text>

          {answered && isWrong && question.explanation && (
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme?.isDark
                  ? "rgba(239,68,68,0.1)"
                  : "#fef2f2",
                padding: 15,
                borderRadius: 12,
                marginTop: 10,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.3)",
              }}
            >
              <Ionicons
                name="information-circle"
                size={22}
                color={colors.incorrect}
                style={{ marginRight: 10 }}
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
                  Çözüm Bilgisi:
                </Text>
                <Text
                  style={{ color: colors.text, fontSize: 13, lineHeight: 20 }}
                >
                  {question.explanation}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* --- OPTIONS --- */}
        <View style={{ paddingHorizontal: 20, marginTop: 25 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontWeight: "bold",
              marginBottom: 15,
            }}
          >
            ŞIKLAR
          </Text>

          {questionOptions.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const showCorrect = answered && option.correct;
            const showWrong = answered && isSelected && !option.correct;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleSelectAnswer(option.id)}
                disabled={answered}
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
                  borderWidth: 1,
                  borderColor: isSelected ? colors.accent : colors.border,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor:
                      showCorrect || showWrong
                        ? "rgba(255,255,255,0.2)"
                        : colors.border,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 15,
                  }}
                >
                  <Text
                    style={{
                      color: showCorrect || showWrong ? "#fff" : colors.text,
                      fontWeight: "bold",
                    }}
                  >
                    {option.id}
                  </Text>
                </View>
                <Text
                  style={{
                    color: showCorrect || showWrong ? "#fff" : colors.text,
                    fontSize: 16,
                    fontWeight: "500",
                    flex: 1,
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
      </ScrollView>

      {/* --- FOOTER NAVIGATION --- */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 10,
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
            height: 50,
            backgroundColor: colors.bgSecondary,
            borderRadius: 12,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 10,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: currentQuestion === 0 ? 0.4 : 1,
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
            height: 50,
            backgroundColor:
              currentQuestion === questions.length - 1
                ? colors.correct
                : colors.accent,
            borderRadius: 12,
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
