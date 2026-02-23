// app/(tabs)/index.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
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
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import { db, OverallStats } from "../../services/database";

const AnimatedView = Animated.createAnimatedComponent(View);

// Heatmap için aktivite seviyesi belirle (0-3)
function activityLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  return 3;
}

export default function Index(): ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<OverallStats | null>(null);

  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const loadStats = useCallback(async () => {
    try {
      await db.initialize();
      const data = await db.getOverallStats();
      setStats(data);
    } catch (e) {
      console.error("Stats yüklenemedi:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Her sekmeye gelindiğinde yenile (test bitince buraya dönünce güncel veriler görünsün)
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  // Parlama animasyonu
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

  if (!theme) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0D0D0D",
        }}
      >
        <ActivityIndicator color="#00E5FF" />
      </View>
    );
  }

  const { isDark, setIsDark } = theme;

  const colors = {
    bg: isDark ? "#0D0D0D" : "#f8f9fa",
    bgSecondary: isDark ? "#121212" : "#ffffff",
    text: isDark ? "#ffffff" : "#1a1a1a",
    textSecondary: isDark ? "#888" : "#555",
    border: isDark ? "#1a1a1a" : "#e5e7eb",
    accent: isDark ? "#00E5FF" : "#2563eb",
  };

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const overallProgress = stats?.overallProgress ?? 0;
  const totalSolved = stats?.totalSolved ?? 0;
  const successPercent = stats?.successPercent ?? 0;
  const completedTests = stats?.completedTests ?? 0;
  const totalTests = stats?.totalTests ?? 0;
  const dailyActivity = stats?.dailyActivity ?? [];
  const subjectStats = stats?.subjectStats ?? [];

  // Heatmap: son 21 gün, 3 satır 7 sütun
  const heatmapRows: { date: string; count: number }[][] = [];
  for (let i = 0; i < 3; i++) {
    heatmapRows.push(dailyActivity.slice(i * 7, i * 7 + 7));
  }

  // Bugün çözülen soru sayısı
  const today = new Date().toISOString().split("T")[0];
  const todayActivity = dailyActivity.find((d) => d.date === today);
  const todaySolved = todayActivity?.count ?? 0;

  const heatCellColor = (level: 0 | 1 | 2 | 3) => {
    if (level === 0) return isDark ? "#1f1f1f" : "#e5e7eb";
    if (level === 1) return "#22d3ee"; // cyan-400
    if (level === 2) return "#34d399"; // emerald-400
    return "#10b981"; // emerald-500
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* --- HEADER --- */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontWeight: "900",
              letterSpacing: -0.5,
            }}
          >
            KPSS Focus
          </Text>
          <Text
            style={{
              color: "#00E5FF",
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 2,
              marginTop: 2,
            }}
          >
            ● SYSTEM ACTIVE
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsDark(!isDark)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            backgroundColor: isDark ? "rgba(0,229,255,0.1)" : "#eff6ff",
            borderColor: isDark ? "#00E5FF" : "#2563eb",
          }}
        >
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={20}
            color={isDark ? "#00E5FF" : "#2563eb"}
          />
        </TouchableOpacity>
      </View>

      {/* --- PROGRESS DAİRESİ --- */}
      <View style={{ alignItems: "center", paddingVertical: 48 }}>
        <AnimatedView
          style={{
            shadowColor: isDark ? "#00E5FF" : "#3b82f6",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowAnim,
            shadowRadius: glowAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [10, 25],
            }),
            elevation: 20,
            borderColor: isDark ? "#00E5FF" : "#2563eb",
            width: 176,
            height: 176,
            borderRadius: 88,
            borderWidth: 3,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#0D0D0D" : "#ffffff",
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 3,
            }}
          >
            GENEL İLERLEME
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 48,
              fontWeight: "900",
              marginVertical: 4,
            }}
          >
            {overallProgress}%
          </Text>
          <Animated.Text
            style={{
              opacity: glowAnim,
              color: "#00E5FF",
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 3,
            }}
          >
            {completedTests}/{totalTests} TEST
          </Animated.Text>
        </AnimatedView>
      </View>

      {/* --- İSTATİSTİK KARTLARI --- */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          marginBottom: 20,
          gap: 8,
        }}
      >
        {/* Çözülen */}
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 8,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            ÇÖZÜLDÜ
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {totalSolved.toLocaleString()}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 9, marginTop: 2 }}
          >
            soru
          </Text>
        </View>

        {/* Bugün */}
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: isDark ? "rgba(220,38,38,0.15)" : "#fef2f2",
            borderWidth: 1,
            borderColor: "#ef4444",
          }}
        >
          <Text
            style={{
              color: "#ef4444",
              fontSize: 8,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            BUGÜN
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {todaySolved}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 9, marginTop: 2 }}
          >
            soru
          </Text>
        </View>

        {/* Başarı */}
        <View
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: colors.bgSecondary,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 8,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            BAŞARI
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "900",
              marginTop: 4,
              color:
                successPercent >= 70
                  ? "#10b981"
                  : successPercent >= 40
                    ? "#f59e0b"
                    : "#ef4444",
            }}
          >
            {totalSolved > 0 ? `${successPercent}%` : "—"}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: 9, marginTop: 2 }}
          >
            oran
          </Text>
        </View>
      </View>

      {/* --- ETKİNLİK HARİTASI --- */}
      <View
        style={{
          marginHorizontal: 20,
          padding: 16,
          borderRadius: 16,
          marginBottom: 20,
          backgroundColor: colors.bgSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 9,
                fontWeight: "800",
                letterSpacing: 2,
              }}
            >
              DEVAMLILIK
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              Etkinlik Haritası
            </Text>
          </View>
          <Text style={{ color: "#00E5FF", fontSize: 9, fontWeight: "700" }}>
            SON 21 GÜN
          </Text>
        </View>

        {heatmapRows.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            {row.map((day, colIdx) => {
              const level = activityLevel(day.count);
              return (
                <View
                  key={colIdx}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    marginHorizontal: 2,
                    borderRadius: 4,
                    backgroundColor: heatCellColor(level),
                  }}
                />
              );
            })}
          </View>
        ))}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            gap: 8,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Az</Text>
          {([0, 1, 2, 3] as const).map((l) => (
            <View
              key={l}
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: heatCellColor(l),
              }}
            />
          ))}
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Çok</Text>
        </View>
      </View>

      {/* --- KONU ANALİZİ --- */}
      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            borderLeftWidth: 2,
            borderLeftColor: "#00E5FF",
            paddingLeft: 10,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 4,
            }}
          >
            KONU ANALİZİ
          </Text>
        </View>

        {subjectStats.length === 0 ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Henüz test çözülmemiş. Konulara git ve başla!
            </Text>
          </View>
        ) : (
          subjectStats.map((subject) => (
            <View key={subject.subjectId} style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  alignItems: "flex-end",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: subject.color,
                    }}
                  />
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    {subject.title.toUpperCase()}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {subject.correctCount + subject.wrongCount > 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                      <Text style={{ color: "#10b981" }}>
                        {subject.correctCount}D
                      </Text>
                      {" / "}
                      <Text style={{ color: "#ef4444" }}>
                        {subject.wrongCount}Y
                      </Text>
                    </Text>
                  )}
                  <Text
                    style={{
                      color: subject.color,
                      fontSize: 12,
                      fontWeight: "900",
                    }}
                  >
                    {subject.progressPercent}%
                  </Text>
                </View>
              </View>
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
                    width: `${subject.progressPercent}%`,
                    backgroundColor: subject.color,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
