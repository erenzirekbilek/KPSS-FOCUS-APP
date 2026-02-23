// app/tests/testlist.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { db, UserProgress } from "../../services/database";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Test {
  id: number;
  subjectId: number;
  title: string;
  questionCount: number;
}

interface GroupedTests {
  [key: string]: Test[];
}

export default function TestListScreen() {
  const { title, color, id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [testGroups, setTestGroups] = useState<GroupedTests>({});
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Map<number, UserProgress>>(
    new Map(),
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      await db.initialize();
      const subjectId = id ? Number(id) : 1;
      const testList = await db.getTestsBySubject(subjectId);

      const grouped = testList.reduce((acc: GroupedTests, test) => {
        const mainTitle = test.title.split(" - ")[0];
        if (!acc[mainTitle]) acc[mainTitle] = [];
        acc[mainTitle].push(test);
        return acc;
      }, {});

      setTestGroups(grouped);

      const pMap = await db.getProgressBySubject(subjectId);
      setProgressMap(pMap);
    } catch (error) {
      console.error("Hata:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const toggleGroup = (groupName: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  if (!theme) return null;
  const { isDark } = theme;
  const activeColor = (color as string) || "#00E5FF";

  const getGroupProgress = (tests: Test[]) => {
    if (tests.length === 0) return 0;
    let total = 0;
    for (const test of tests) {
      const p = progressMap.get(test.id);
      if (p) {
        if (p.isCompleted) total += 100;
        else
          total += Math.round((p.lastQuestionIndex / test.questionCount) * 100);
      }
    }
    return Math.round(total / tests.length);
  };

  const getTestProgress = (test: Test) => {
    const p = progressMap.get(test.id);
    if (!p)
      return { percent: 0, isCompleted: false, correctCount: 0, wrongCount: 0 };
    const percent = p.isCompleted
      ? 100
      : Math.round((p.lastQuestionIndex / test.questionCount) * 100);
    return {
      percent,
      isCompleted: !!p.isCompleted,
      correctCount: p.correctCount || 0,
      wrongCount: p.wrongCount || 0,
    };
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0D0D0D" : "#f8f9fa" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? "#fff" : "#000"}
          />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 32,
            fontWeight: "900",
            color: isDark ? "#fff" : "#111",
            marginBottom: 20,
          }}
        >
          {title}
        </Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={activeColor}
            style={{ marginTop: 50 }}
          />
        ) : Object.keys(testGroups).length > 0 ? (
          Object.entries(testGroups).map(([groupTitle, tests]) => {
            const isExpanded = expandedGroups[groupTitle];
            const groupPercent = getGroupProgress(tests);
            const groupCompleted = tests.filter(
              (t) => progressMap.get(t.id)?.isCompleted,
            ).length;

            return (
              <View
                key={groupTitle}
                style={{ marginBottom: 12, overflow: "hidden" }}
              >
                {/* KLASÖR BAŞLIĞI */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleGroup(groupTitle)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 18,
                    backgroundColor: isDark ? "#1A1A1A" : "#FFF",
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: isExpanded
                      ? activeColor
                      : isDark
                        ? "#222"
                        : "#E5E7EB",
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: isExpanded
                        ? activeColor
                        : isDark
                          ? "#222"
                          : "#F3F4F6",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 15,
                    }}
                  >
                    <Ionicons
                      name={isExpanded ? "folder-open" : "folder"}
                      size={22}
                      color={isExpanded ? "#FFF" : activeColor}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: isDark ? "#FFF" : "#111",
                        fontWeight: "700",
                        fontSize: 16,
                      }}
                    >
                      {groupTitle}
                    </Text>
                    <Text
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      {groupCompleted}/{tests.length} Tamamlandı
                    </Text>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: isDark ? "#333" : "#E5E7EB",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          width: `${groupPercent}%`,
                          backgroundColor:
                            groupPercent === 100 ? "#10b981" : activeColor,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                    <Text
                      style={{
                        color: groupPercent === 100 ? "#10b981" : activeColor,
                        fontWeight: "700",
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      %{groupPercent}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </View>
                </TouchableOpacity>

                {/* TEST LİSTESİ */}
                {isExpanded && (
                  <View style={{ marginTop: 8, paddingLeft: 10 }}>
                    {tests.map((test, index) => {
                      const { percent, isCompleted, correctCount, wrongCount } =
                        getTestProgress(test);
                      const statusColor = isCompleted
                        ? "#10b981"
                        : percent > 0
                          ? activeColor
                          : "#6b7280";
                      const hasStats = correctCount > 0 || wrongCount > 0;

                      return (
                        <TouchableOpacity
                          key={test.id}
                          onPress={() => {
                            router.push({
                              pathname: "/tests/questions",
                              params: {
                                testId: test.id.toString(),
                                testTitle: test.title,
                                color: activeColor,
                              },
                            });
                            // Sayfadan dönünce progress'i yenile
                            setTimeout(loadData, 500);
                          }}
                          style={{
                            padding: 15,
                            backgroundColor: isDark ? "#121212" : "#F9FAFB",
                            borderRadius: 12,
                            marginBottom: 6,
                            borderLeftWidth: 3,
                            borderLeftColor: statusColor,
                          }}
                        >
                          {/* Satır 1: numara, başlık, soru sayısı, ikon */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: hasStats ? 8 : 4,
                            }}
                          >
                            <Text
                              style={{
                                color: isDark ? "#BBB" : "#444",
                                fontWeight: "bold",
                                width: 25,
                              }}
                            >
                              {index + 1}.
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                color: isDark ? "#EEE" : "#111",
                                fontWeight: "500",
                              }}
                            >
                              {test.title.includes(" - ")
                                ? test.title.split(" - ")[1]
                                : test.title}
                            </Text>
                            <Text
                              style={{
                                color: "#6b7280",
                                fontSize: 11,
                                marginRight: 8,
                              }}
                            >
                              {test.questionCount} Soru
                            </Text>
                            {isCompleted ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color="#10b981"
                              />
                            ) : percent > 0 ? (
                              <Ionicons
                                name="play-circle"
                                size={20}
                                color={activeColor}
                              />
                            ) : (
                              <Ionicons
                                name="play-circle-outline"
                                size={20}
                                color="#6b7280"
                              />
                            )}
                          </View>

                          {/* Satır 2: D/Y istatistikleri (varsa) */}
                          {hasStats && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                                paddingLeft: 25,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginRight: 12,
                                }}
                              >
                                <Ionicons
                                  name="checkmark-circle"
                                  size={14}
                                  color="#10b981"
                                />
                                <Text
                                  style={{
                                    color: "#10b981",
                                    fontSize: 12,
                                    fontWeight: "700",
                                    marginLeft: 4,
                                  }}
                                >
                                  {correctCount} Doğru
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginRight: 12,
                                }}
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={14}
                                  color="#ef4444"
                                />
                                <Text
                                  style={{
                                    color: "#ef4444",
                                    fontSize: 12,
                                    fontWeight: "700",
                                    marginLeft: 4,
                                  }}
                                >
                                  {wrongCount} Yanlış
                                </Text>
                              </View>
                              {isCompleted && (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                  }}
                                >
                                  <Text
                                    style={{
                                      color: statusColor,
                                      fontSize: 12,
                                      fontWeight: "700",
                                    }}
                                  >
                                    %
                                    {Math.round(
                                      (correctCount / test.questionCount) * 100,
                                    )}{" "}
                                    Başarı
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Satır 3: Progress bar */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingLeft: 25,
                            }}
                          >
                            <View
                              style={{
                                flex: 1,
                                height: 3,
                                backgroundColor: isDark ? "#333" : "#E5E7EB",
                                borderRadius: 2,
                                overflow: "hidden",
                                marginRight: 8,
                              }}
                            >
                              <View
                                style={{
                                  height: "100%",
                                  width: `${percent}%`,
                                  backgroundColor: statusColor,
                                  borderRadius: 2,
                                }}
                              />
                            </View>
                            <Text
                              style={{
                                color: statusColor,
                                fontSize: 11,
                                fontWeight: "700",
                                width: 32,
                                textAlign: "right",
                              }}
                            >
                              %{percent}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: "center", marginTop: 100 }}>
            <Ionicons name="alert-circle-outline" size={64} color="#374151" />
            <Text style={{ color: "#6b7280", marginTop: 16 }}>
              Test bulunamadı.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
