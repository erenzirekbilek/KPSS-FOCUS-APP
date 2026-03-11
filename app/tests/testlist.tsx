// app/tests/testlist.tsx

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
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

// ─── Tipler ───────────────────────────────────────────────────────────────────
interface Test {
  id: number;
  subjectId: number;
  title: string;
  questionCount: number;
}
interface GroupedTests {
  [key: string]: Test[];
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Renk psikolojisi: %0 gri → %1-49 turuncu → %50-99 tema rengi → %100 yeşil */
function progressColor(percent: number, activeColor: string): string {
  if (percent === 0) return "#6b7280";
  if (percent === 100) return "#10b981";
  if (percent < 50) return "#f59e0b";
  return activeColor;
}

// ─── Skeleton Kart ────────────────────────────────────────────────────────────
function SkeletonGroup({ isDark }: { isDark: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 850,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [anim]);
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? "rgba(24,24,26,1)" : "rgba(218,222,230,1)",
      isDark ? "rgba(32,32,34,1)" : "rgba(232,236,242,1)",
    ],
  });
  return (
    <View style={{ marginBottom: 12, gap: 8 }}>
      <Animated.View
        style={{ height: 80, borderRadius: 20, backgroundColor: bg }}
      />
      <Animated.View
        style={{
          height: 80,
          borderRadius: 20,
          backgroundColor: bg,
          opacity: 0.7,
        }}
      />
      <Animated.View
        style={{
          height: 80,
          borderRadius: 20,
          backgroundColor: bg,
          opacity: 0.4,
        }}
      />
    </View>
  );
}

// ─── Test Kartı (memo) ────────────────────────────────────────────────────────
interface TestItemProps {
  test: Test;
  index: number;
  isDark: boolean;
  activeColor: string;
  percent: number;
  isCompleted: boolean;
  correctCount: number;
  wrongCount: number;
  onPress: () => void;
}

const TestItem = memo(function TestItem({
  test,
  index,
  isDark,
  activeColor,
  percent,
  isCompleted,
  correctCount,
  wrongCount,
  onPress,
}: TestItemProps) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 340,
      delay: index * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, index]);

  const statusColor = progressColor(percent, activeColor);
  const hasStats = correctCount > 0 || wrongCount > 0;
  const successRate =
    test.questionCount > 0
      ? Math.round((correctCount / test.questionCount) * 100)
      : 0;

  const testLabel = test.title.includes(" - ")
    ? test.title.split(" - ")[1]
    : test.title;

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [
          {
            translateX: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
          { scale: pressAnim },
        ],
        marginBottom: 10,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(pressAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(pressAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
          }).start()
        }
        onPress={onPress}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{
          backgroundColor: isDark
            ? "rgba(20,20,22,0.95)"
            : "rgba(255,255,255,0.97)",
          borderRadius: 18,
          borderWidth: 0.5,
          borderColor: isDark
            ? hexAlpha(statusColor, 0.25)
            : "rgba(0,0,0,0.06)",
          overflow: "hidden",
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.15 : 0.08,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        {/* Sol renk şerit */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: statusColor,
            shadowColor: statusColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />

        <View style={{ padding: 15, paddingLeft: 18 }}>
          {/* Üst satır */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: hasStats ? 10 : 8,
            }}
          >
            {/* Sıra numarası */}
            <Text
              style={{
                color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                fontSize: 10,
                fontWeight: "800",
                width: 22,
                letterSpacing: 0.5,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </Text>

            {/* Başlık */}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: isDark ? "#ECEEF2" : "#111318",
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {testLabel}
            </Text>

            {/* Soru sayısı */}
            <Text
              style={{
                color: isDark ? "#575C6A" : "#7C8494",
                fontSize: 10,
                marginRight: 10,
              }}
            >
              {test.questionCount} soru
            </Text>

            {/* Tamamlanmışsa büyük başarı rozeti, değilse ikon */}
            {isCompleted ? (
              <View
                style={{
                  backgroundColor: hexAlpha("#10b981", 0.12),
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  borderWidth: 0.5,
                  borderColor: hexAlpha("#10b981", 0.3),
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text
                  style={{ color: "#10b981", fontSize: 11, fontWeight: "900" }}
                >
                  %{successRate}
                </Text>
                <Ionicons name="checkmark" size={11} color="#10b981" />
              </View>
            ) : percent > 0 ? (
              <Ionicons name="play-circle" size={20} color={activeColor} />
            ) : (
              <Ionicons name="play-circle-outline" size={20} color="#6b7280" />
            )}
          </View>

          {/* İstatistik satırı (varsa) */}
          {hasStats && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                marginBottom: 8,
                paddingLeft: 22,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
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
                  style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}
                >
                  {correctCount} D
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
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
                  style={{ color: "#ef4444", fontSize: 11, fontWeight: "700" }}
                >
                  {wrongCount} Y
                </Text>
              </View>
              {!isCompleted && percent > 0 && (
                <Text
                  style={{
                    color: isDark ? "#575C6A" : "#7C8494",
                    fontSize: 10,
                  }}
                >
                  devam ediyor...
                </Text>
              )}
            </View>
          )}

          {/* Progress bar */}
          <View style={{ paddingLeft: 22 }}>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.06)",
                overflow: "visible",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${percent}%`,
                  backgroundColor: statusColor,
                  borderRadius: 2,
                }}
              >
                {percent > 0 && percent < 100 && (
                  <View
                    style={{
                      position: "absolute",
                      right: -2,
                      top: -2,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: statusColor,
                      shadowColor: statusColor,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 5,
                    }}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Klasör Kartı ─────────────────────────────────────────────────────────────
interface FolderCardProps {
  groupTitle: string;
  tests: Test[];
  isExpanded: boolean;
  isDark: boolean;
  activeColor: string;
  groupPercent: number;
  groupCompleted: number;
  totalQuestions: number;
  onToggle: () => void;
  onTestPress: (test: Test) => void;
  getTestProgress: (t: Test) => {
    percent: number;
    isCompleted: boolean;
    correctCount: number;
    wrongCount: number;
  };
}

function FolderCard({
  groupTitle,
  tests,
  isExpanded,
  isDark,
  activeColor,
  groupPercent,
  groupCompleted,
  totalQuestions,
  onToggle,
  onTestPress,
  getTestProgress,
}: FolderCardProps) {
  const rotateAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const folderColor = progressColor(groupPercent, activeColor);

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Klasör başlığı */}
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
          }).start()
        }
        onPress={onToggle}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            backgroundColor: isDark
              ? "rgba(20,20,22,0.95)"
              : "rgba(255,255,255,0.97)",
            borderRadius: isExpanded ? 20 : 20,
            borderBottomLeftRadius: isExpanded ? 0 : 20,
            borderBottomRightRadius: isExpanded ? 0 : 20,
            borderWidth: 0.5,
            borderColor: isExpanded
              ? hexAlpha(activeColor, 0.35)
              : isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.06)",
            borderBottomWidth: isExpanded ? 0 : 0.5,
            shadowColor: isExpanded ? activeColor : "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark
              ? isExpanded
                ? 0.22
                : 0.12
              : isExpanded
                ? 0.12
                : 0.06,
            shadowRadius: 12,
            elevation: 4,
            overflow: "hidden",
          }}
        >
          {/* Üst aksent şerit — sadece açıkken */}
          {isExpanded && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 2.5,
                backgroundColor: activeColor,
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
              }}
            />
          )}

          <View
            style={{ flexDirection: "row", alignItems: "center", padding: 18 }}
          >
            {/* İkon kutu */}
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: isExpanded
                  ? hexAlpha(activeColor, isDark ? 0.18 : 0.12)
                  : isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                borderWidth: 0.5,
                borderColor: isExpanded
                  ? hexAlpha(activeColor, 0.35)
                  : "transparent",
              }}
            >
              <Ionicons
                name={isExpanded ? "folder-open" : "folder"}
                size={22}
                color={
                  isExpanded ? activeColor : isDark ? "#575C6A" : "#9CA3AF"
                }
              />
            </View>

            {/* Metin */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isDark ? "#ECEEF2" : "#111318",
                  fontWeight: "700",
                  fontSize: 15,
                  marginBottom: 3,
                  letterSpacing: -0.2,
                }}
              >
                {groupTitle}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: isDark ? "#575C6A" : "#7C8494",
                    fontSize: 11,
                  }}
                >
                  {groupCompleted}/{tests.length} tamamlandı
                </Text>
                <View
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 1.5,
                    backgroundColor: isDark ? "#575C6A" : "#9CA3AF",
                  }}
                />
                <Text
                  style={{
                    color: isDark ? "#575C6A" : "#7C8494",
                    fontSize: 11,
                  }}
                >
                  {totalQuestions} soru
                </Text>
              </View>
              {/* Progress bar */}
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.06)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${groupPercent}%`,
                    backgroundColor: folderColor,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>

            {/* Sağ: yüzde + chevron */}
            <View style={{ alignItems: "flex-end", marginLeft: 12, gap: 4 }}>
              <Text
                style={{
                  color: folderColor,
                  fontWeight: "800",
                  fontSize: 15,
                  letterSpacing: -0.5,
                }}
              >
                %{groupPercent}
              </Text>
              <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={isDark ? "#575C6A" : "#9CA3AF"}
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Test listesi */}
      {isExpanded && (
        <View
          style={{
            backgroundColor: isDark
              ? "rgba(14,14,16,0.7)"
              : "rgba(248,250,252,0.9)",
            borderWidth: 0.5,
            borderTopWidth: 0,
            borderColor: hexAlpha(activeColor, 0.35),
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            padding: 12,
            paddingTop: 10,
          }}
        >
          {tests.map((test, i) => {
            const prog = getTestProgress(test);
            return (
              <TestItem
                key={test.id}
                test={test}
                index={i}
                isDark={isDark}
                activeColor={activeColor}
                {...prog}
                onPress={() => onTestPress(test)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function TestListScreen() {
  const { title, color, id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  const [testGroups, setTestGroups] = useState<GroupedTests>({});
  const [expandedGroups, setExpandedGroups] = useState<{
    [k: string]: boolean;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Map<number, UserProgress>>(
    new Map(),
  );

  // Sticky header scroll animasyonu
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 90 + (insets.top || 0);

  const titleScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.82],
    extrapolate: "clamp",
  });
  const titleTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -6],
    extrapolate: "clamp",
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [40, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const loadData = useCallback(async () => {
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
  }, [id]);

  // setTimeout workaround yerine useFocusEffect
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const toggleGroup = (groupName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const { isDark } = theme ?? { isDark: true };
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

  const getTestProgress = useCallback(
    (test: Test) => {
      const p = progressMap.get(test.id);
      if (!p)
        return {
          percent: 0,
          isCompleted: false,
          correctCount: 0,
          wrongCount: 0,
        };
      const percent = p.isCompleted
        ? 100
        : Math.round((p.lastQuestionIndex / test.questionCount) * 100);
      return {
        percent,
        isCompleted: !!p.isCompleted,
        correctCount: p.correctCount || 0,
        wrongCount: p.wrongCount || 0,
      };
    },
    [progressMap],
  );

  const handleTestPress = useCallback(
    (test: Test) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push({
        pathname: "/tests/questions",
        params: {
          testId: test.id.toString(),
          testTitle: test.title,
          color: activeColor,
        },
      });
    },
    [router, activeColor],
  );

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0D0D0E" : "#F2F4F8" }}>
      {/* ── STICKY HEADER ── */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 14,
          backgroundColor: isDark
            ? "rgba(13,13,14,0.92)"
            : "rgba(242,244,248,0.92)",
        }}
      >
        {/* Alt border — scroll ettikçe beliriyor */}
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 0.5,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(0,0,0,0.08)",
            opacity: headerBorderOpacity,
          }}
        />

        {/* Geri butonu + başlık */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 38,
              height: 38,
              borderRadius: 13,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.07)",
            }}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isDark ? "#ECEEF2" : "#111318"}
            />
          </TouchableOpacity>

          <Animated.Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: isDark ? "#ECEEF2" : "#111318",
              fontSize: 22,
              fontWeight: "800",
              letterSpacing: -0.5,
              transform: [
                { scale: titleScale },
                { translateY: titleTranslateY },
              ],
            }}
          >
            {title}
          </Animated.Text>

          {/* Konuya özel renk noktası */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: activeColor,
              shadowColor: activeColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }}
          />
        </View>
      </Animated.View>

      {/* ── SCROLL İÇERİK ── */}
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: headerHeight + 16,
          paddingBottom: insets.bottom + 50,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <SkeletonGroup isDark={isDark} />
        ) : Object.keys(testGroups).length > 0 ? (
          Object.entries(testGroups).map(([groupTitle, tests]) => {
            const isExpanded = !!expandedGroups[groupTitle];
            const groupPercent = getGroupProgress(tests);
            const groupCompleted = tests.filter(
              (t) => progressMap.get(t.id)?.isCompleted,
            ).length;
            const totalQuestions = tests.reduce(
              (sum, t) => sum + t.questionCount,
              0,
            );

            return (
              <FolderCard
                key={groupTitle}
                groupTitle={groupTitle}
                tests={tests}
                isExpanded={isExpanded}
                isDark={isDark}
                activeColor={activeColor}
                groupPercent={groupPercent}
                groupCompleted={groupCompleted}
                totalQuestions={totalQuestions}
                onToggle={() => toggleGroup(groupTitle)}
                onTestPress={handleTestPress}
                getTestProgress={getTestProgress}
              />
            );
          })
        ) : (
          /* ── Empty State ── */
          <View style={{ alignItems: "center", paddingTop: 80, gap: 16 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 0.5,
                borderColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.07)",
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={36}
                color={isDark ? "#575C6A" : "#9CA3AF"}
              />
            </View>
            <Text
              style={{
                color: isDark ? "#ECEEF2" : "#111318",
                fontSize: 17,
                fontWeight: "700",
              }}
            >
              Test bulunamadı
            </Text>
            <Text
              style={{
                color: isDark ? "#575C6A" : "#7C8494",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              Bu konuya henüz test eklenmemiş.
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                marginTop: 8,
                paddingVertical: 13,
                paddingHorizontal: 28,
                backgroundColor: activeColor,
                borderRadius: 16,
                shadowColor: activeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
              }}
            >
              <Text
                style={{
                  color: isDark ? "#000" : "#fff",
                  fontWeight: "800",
                  fontSize: 14,
                }}
              >
                Ders Seçimine Dön
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
