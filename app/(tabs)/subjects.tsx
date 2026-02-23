// app/(tabs)/subjects.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // 1. Router'ı import ettik
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
};

const DarkMode = {
  bg: "#0D0D0D",
  bgSecondary: "#121212",
  text: "#ffffff",
  textSecondary: "#aaa",
  border: "#1a1a1a",
  accent: "#00E5FF",
  accentLight: "rgba(0, 229, 255, 0.1)",
};

// ============= MOCK DATA =============
const MOCK_DATA = {
  categories: [
    { id: 1, name: "General Culture", active: true },
    { id: 2, name: "General Ability", active: false },
    { id: 3, name: "Educational", active: false },
  ],
  subjects: {
    "General Culture": [
      {
        id: 1,
        title: "Tarih",
        progress: 65,
        completed: 640,
        total: 1000,
        color: "#3b82f6",
        icon: "book",
      },
      {
        id: 2,
        title: "Coğrafya",
        progress: 42,
        completed: 530,
        total: 800,
        color: "#06b6d4",
        icon: "compass",
      },
      {
        id: 3,
        title: "Citizenship",
        progress: 12,
        completed: 60,
        total: 500,
        color: "#d946ef",
        icon: "shield",
      },
      {
        id: 4,
        title: "Güncel Bilgiler",
        progress: 88,
        completed: 880,
        total: 1000,
        color: "#f43f5e",
        icon: "newspaper",
        isPremium: true,
      },
      {
        id: 5,
        title: "Matematik",
        progress: 45,
        completed: 450,
        total: 1000,
        color: "#10b981",
        icon: "calculator",
        isLocked: true,
      },
    ],
  },
};

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

export default function Subjects(): ReactElement {
  const [activeCategory, setActiveCategory] = useState("General Culture");
  const theme = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter(); // 2. Router kancasını tanımladık

  if (!theme) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <Text style={{ color: "#ffffff" }}>Loading...</Text>
      </View>
    );
  }

  const { isDark } = theme;
  const colors = isDark ? DarkMode : LightMode;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: 40,
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
          <Text
            style={{
              color: colors.text,
              fontSize: getResponsiveValue(width, 24, 26, 28),
              fontWeight: "900",
              letterSpacing: -1,
            }}
          >
            Konular
          </Text>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: colors.accentLight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="settings" size={18} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* --- CATEGORY TABS --- */}
        <View
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: getResponsiveValue(width, 16, 20, 24),
            }}
          >
            {MOCK_DATA.categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setActiveCategory(category.name)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 4,
                  marginRight: 20,
                  borderBottomWidth: activeCategory === category.name ? 2 : 0,
                  borderBottomColor: colors.accent,
                }}
              >
                <Text
                  style={{
                    color:
                      activeCategory === category.name
                        ? colors.accent
                        : colors.textSecondary,
                    fontSize: 12,
                    fontWeight:
                      activeCategory === category.name ? "700" : "500",
                  }}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* --- SUBJECT CARDS --- */}
        <View
          style={{
            paddingHorizontal: getResponsiveValue(width, 16, 20, 24),
            paddingTop: 16,
          }}
        >
          {MOCK_DATA.subjects[
            activeCategory as keyof typeof MOCK_DATA.subjects
          ]?.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.bgSecondary,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              activeOpacity={0.7}
              onPress={() => {
                // 3. YÖNLENDİRME BURADA: Eğer kilitli değilse test listesine git
                if (!subject.isLocked) {
                  router.push({
                    pathname: "/tests/testlist",
                    params: {
                      id: subject.id,
                      title: subject.title,
                      color: subject.color,
                    },
                  });
                }
              }}
            >
              {/* Icon */}
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: subject.color,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  opacity: subject.isLocked ? 0.5 : 1,
                }}
              >
                <Ionicons
                  name={subject.icon as any}
                  size={24}
                  color="#ffffff"
                />
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "700",
                      flex: 1,
                    }}
                  >
                    {subject.title}
                  </Text>
                  {subject.isPremium && (
                    <View
                      style={{
                        backgroundColor: subject.color,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginLeft: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 9,
                          fontWeight: "700",
                        }}
                      >
                        PRO
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginBottom: 6,
                  }}
                >
                  {subject.completed} / {subject.total} Tamamlanan Soru
                </Text>
                <View
                  style={{
                    height: 4,
                    backgroundColor: colors.border,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${subject.progress}%`,
                      backgroundColor: subject.color,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>

              {/* Right Section */}
              <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                {subject.isLocked ? (
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={colors.textSecondary}
                  />
                ) : (
                  <>
                    <Text
                      style={{
                        color: subject.color,
                        fontSize: 16,
                        fontWeight: "900",
                        marginBottom: 2,
                      }}
                    >
                      {subject.progress}%
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Locked Content Message */}
        <View
          style={{
            marginHorizontal: getResponsiveValue(width, 16, 20, 24),
            marginTop: 20,
            padding: 12,
            backgroundColor: colors.bgSecondary,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Ionicons name="lock-closed" size={24} color={colors.textSecondary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Matematik konu başlıkları serbest
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
