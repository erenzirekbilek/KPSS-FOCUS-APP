// app/(tabs)/stats.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { ReactElement, useContext, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";

// ============= COLOR SCHEMES =============
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
  bg: "#0D0D0D",
  bgSecondary: "#121212",
  text: "#ffffff",
  textSecondary: "#aaa",
  border: "#1a1a1a",
  accent: "#00E5FF",
  accentLight: "rgba(0, 229, 255, 0.1)",
  correct: "#10b981",
  incorrect: "#ef4444",
};

// ============= MOCK DATA =============
const MOCK_QUESTIONS = [
  {
    id: 1,
    category: "KÜLTÜR",
    question: "Lale Devri, III. Ahmet döneminde yaşanmıştır.",
    hint: "Bu doğru mu?",
    progress: 14,
    total: 30,
    answer: true,
  },
  {
    id: 2,
    category: "SİYASET",
    question: "Osmanlı İmparatorluğu 1453 yılında kurulmuştur.",
    hint: "Tarihsel bir gerçek midir?",
    progress: 15,
    total: 30,
    answer: false,
  },
  {
    id: 3,
    category: "COĞRAFYa",
    question: "Ankara, Türkiye'nin en büyük şehridir.",
    hint: "Doğruluk seviyesini kontrol et",
    progress: 20,
    total: 30,
    answer: false,
  },
];

// ============= RESPONSIVE HELPER =============
const getResponsiveValue = (
  width: number,
  small: number,
  medium: number,
  large: number,
): number => {
  if (width < 375) return small;
  if (width < 768) return medium;
  return large;
};

export default function Stats(): ReactElement {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const theme = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (!theme) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <Text style={{ color: "#ffffff" }}>Loading...</Text>
      </View>
    );
  }

  const { isDark } = theme;
  const colors = isDark ? DarkMode : LightMode;
  const question = MOCK_QUESTIONS[currentQuestion];

  const handleAnswer = (answer: boolean) => {
    setAnswered(answer);
    setIsCorrect(answer === question.answer);
  };

  const handleNext = () => {
    if (currentQuestion < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswered(null);
      setIsCorrect(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top,
        paddingBottom: getResponsiveValue(width, 100, 110, 120),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* --- HEADER --- */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: getResponsiveValue(width, 16, 20, 24),
          paddingVertical: getResponsiveValue(width, 12, 14, 16),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity style={{ width: 30 }}>
          <Ionicons name="close" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: "700",
            flex: 1,
            textAlign: "center",
          }}
        >
          Hızlı D/Y Turu
        </Text>
        <TouchableOpacity style={{ width: 30, alignItems: "flex-end" }}>
          <Ionicons name="time" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* --- PROGRESS BAR --- */}
      <View
        style={{
          paddingHorizontal: getResponsiveValue(width, 16, 20, 24),
          paddingVertical: 16,
        }}
      >
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
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            Osmanlı Kültür Dönemler
          </Text>
          <Text
            style={{
              color: colors.accent,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            {question.progress} / {question.total}
          </Text>
        </View>

        <View
          style={{
            height: 6,
            backgroundColor: colors.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${(question.progress / question.total) * 100}%`,
              backgroundColor: colors.accent,
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      {/* --- MAIN CONTENT --- */}
      <View
        style={{
          paddingHorizontal: getResponsiveValue(width, 16, 20, 24),
          paddingVertical: 20,
        }}
      >
        {/* Category Badge */}
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: colors.accentLight,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 4,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: colors.accent,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            {question.category}
          </Text>
        </View>

        {/* Question Card */}
        <View
          style={{
            backgroundColor: colors.bgSecondary,
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
          }}
        >
          {/* Image Placeholder */}
          <View
            style={{
              height: 200,
              backgroundColor: colors.border,
              borderRadius: 10,
              marginBottom: 20,
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <Ionicons name="image" size={50} color={colors.textSecondary} />
          </View>

          {/* Question Number */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            SORU {currentQuestion + 1}
          </Text>

          {/* Question Text */}
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: "700",
              lineHeight: 28,
              marginBottom: 16,
            }}
          >
            {question.question}
          </Text>

          {/* Hint */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Ionicons
              name="help-circle"
              size={16}
              color={colors.textSecondary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              {question.hint}
            </Text>
          </View>
        </View>

        {/* Answer Buttons */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          {/* YANLIŞ Button */}
          <TouchableOpacity
            onPress={() => handleAnswer(false)}
            disabled={answered !== null}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor:
                answered === false ? colors.incorrect : colors.bgSecondary,
              borderWidth: 1,
              borderColor:
                answered === false ? colors.incorrect : colors.border,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: answered !== null && answered !== false ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={answered === false ? "close-circle" : "close"}
              size={20}
              color={answered === false ? "#ffffff" : colors.incorrect}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: answered === false ? "#ffffff" : colors.incorrect,
                fontSize: 14,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              YANLIŞ
            </Text>
          </TouchableOpacity>

          {/* DOĞRU Button */}
          <TouchableOpacity
            onPress={() => handleAnswer(true)}
            disabled={answered !== null}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor:
                answered === true ? colors.correct : colors.bgSecondary,
              borderWidth: 1,
              borderColor: answered === true ? colors.correct : colors.border,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              opacity: answered !== null && answered !== true ? 0.5 : 1,
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={answered === true ? "checkmark-circle" : "checkmark"}
              size={20}
              color={answered === true ? "#ffffff" : colors.correct}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: answered === true ? "#ffffff" : colors.correct,
                fontSize: 14,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              DOĞRU
            </Text>
          </TouchableOpacity>
        </View>

        {/* Answer Result */}
        {answered !== null && (
          <View
            style={{
              marginBottom: 16,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: colors.bgSecondary,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isCorrect ? colors.correct : colors.incorrect,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={isCorrect ? "checkmark" : "close"}
              size={18}
              color={isCorrect ? colors.correct : colors.incorrect}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isCorrect ? colors.correct : colors.incorrect,
                  fontSize: 14,
                  fontWeight: "700",
                  marginBottom: 2,
                }}
              >
                {isCorrect ? "✓ Doğru Cevaptı!" : "✗ Yanlış Cevaptı!"}
              </Text>
              <Text
                style={{
                  color: isCorrect ? colors.correct : colors.incorrect,
                  fontSize: 11,
                }}
              >
                {isCorrect ? "+10 PUAN" : "0 PUAN"}
              </Text>
            </View>
          </View>
        )}

        {/* Next Button */}
        {answered !== null && currentQuestion < MOCK_QUESTIONS.length - 1 && (
          <TouchableOpacity
            onPress={handleNext}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: colors.accent,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              SONRAKI SORU
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#ffffff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        )}

        {/* Finish Button */}
        {answered !== null && currentQuestion === MOCK_QUESTIONS.length - 1 && (
          <TouchableOpacity
            style={{
              paddingVertical: 14,
              paddingHorizontal: 20,
              backgroundColor: colors.accent,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              TÜRÜ BİTİR
            </Text>
            <Ionicons
              name="checkmark"
              size={18}
              color="#ffffff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        )}

        {/* Stats Footer */}
        {answered !== null && (
          <View
            style={{
              marginTop: 20,
              paddingHorizontal: 12,
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-around",
              backgroundColor: colors.bgSecondary,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                PUAN
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                +{isCorrect ? "10" : "0"}
              </Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
              }}
            />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                BAŞARI
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                78%
              </Text>
            </View>
            <View
              style={{
                width: 1,
                backgroundColor: colors.border,
              }}
            />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                ZAMAN
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  marginTop: 4,
                }}
              >
                45s
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
