// app/(tabs)/subjects.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  ReactElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import { db } from "../../services/database";
import { playSound } from "../../utils/soundManager";

// ─── Ders Görselleri ──────────────────────────────────────────────────────────
const SUBJECT_IMAGES: Record<string, ImageSourcePropType> = {
  tarih: require("../../assets/images/tarih.png"),
  vatandaşlık: require("../../assets/images/vatandaşlık.png"),
  "güncel bilgiler": require("../../assets/images/güncel-bilgiler.png"),
  coğrafya: require("../../assets/images/coğrafya.png"),
};

// Title'dan görsel eşleştirme — büyük/küçük harf duyarsız, kısmi eşleşme
function getSubjectImage(title: string): ImageSourcePropType | null {
  const lower = title.toLowerCase().trim();
  for (const [key, img] of Object.entries(SUBJECT_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  return null;
}

// ─── Tema ─────────────────────────────────────────────────────────────────────
const LightMode = {
  bg: "#F2F4F8",
  bgCard: "rgba(255,255,255,0.96)",
  text: "#111318",
  textSecondary: "#7C8494",
  border: "rgba(0,0,0,0.06)",
  accent: "#2563eb",
};

const DarkMode = {
  bg: "#0D0D0E",
  bgCard: "rgba(20,20,22,0.92)",
  text: "#ECEEF2",
  textSecondary: "#575C6A",
  border: "rgba(255,255,255,0.06)",
  accent: "#00E5FF",
};

// ─── Tipler ───────────────────────────────────────────────────────────────────
interface SubjectWithProgress {
  id: number;
  title: string;
  color: string;
  icon: string;
  progressPercent: number;
  correctCount: number;
  wrongCount: number;
  completedTests: number;
  totalTests: number;
  isPremium?: boolean;
  isLocked?: boolean;
}

const SUBJECT_META: Record<
  number,
  { isPremium?: boolean; isLocked?: boolean }
> = {
  4: { isPremium: true },
  5: { isLocked: true },
};

// ─── Yardımcı: hex → rgba ─────────────────────────────────────────────────────
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Ders İkon Bileşeni ───────────────────────────────────────────────────────
// Görsel varsa foto + shimmer skeleton, yoksa Ionicons fallback
function SubjectIconBox({
  subject,
  size = 42,
  borderRadius = 14,
  iconSize = 20,
}: {
  subject: SubjectWithProgress;
  size?: number;
  borderRadius?: number;
  iconSize?: number;
}) {
  const img = getSubjectImage(subject.title);
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const shimmerBg = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [hexAlpha(subject.color, 0.1), hexAlpha(subject.color, 0.22)],
  });

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: hexAlpha(subject.color, 0.14),
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: hexAlpha(subject.color, 0.28),
        overflow: "hidden",
      }}
    >
      {img && !imgError ? (
        <>
          {!loaded && (
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: shimmerBg,
              }}
            />
          )}
          <Animated.Image
            source={img}
            style={{ width: size, height: size, opacity: fadeAnim }}
            resizeMode="cover"
            fadeDuration={0}
            onLoad={onLoad}
            onError={() => setImgError(true)}
          />
        </>
      ) : (
        <Ionicons
          name={subject.icon as any}
          size={iconSize}
          color={subject.color}
        />
      )}
    </View>
  );
}

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────
function SkeletonCard({
  isDark,
  width,
  height = 160,
}: {
  isDark: boolean;
  width: number;
  height?: number;
}) {
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
    <Animated.View
      style={{ width, height, borderRadius: 28, backgroundColor: bg }}
    />
  );
}

// ─── Grid Kart ────────────────────────────────────────────────────────────────
interface CardProps {
  subject: SubjectWithProgress;
  index: number;
  isDark: boolean;
  colors: typeof DarkMode;
  width: number;
  onPress: () => void;
}

function SubjectCard({
  subject,
  index,
  isDark,
  colors,
  width,
  onPress,
}: CardProps) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, index]);

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        useNativeDriver: true,
        speed: 60,
        bounciness: 0,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 25,
        bounciness: 8,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.06, isDark ? 0.22 : 0.12],
  });

  const img = getSubjectImage(subject.title);

  return (
    <Animated.View
      style={{
        width,
        opacity: enterAnim,
        transform: [
          {
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
          { scale: scaleAnim },
        ],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          shadowColor: subject.color,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity,
          shadowRadius: 18,
          elevation: 8,
        }}
      />

      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => {
          if (subject.isLocked) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          playSound("click");
          onPress();
        }}
        style={{
          borderRadius: 28,
          overflow: "hidden",
          backgroundColor: colors.bgCard,
          borderWidth: 0.5,
          borderColor: isDark
            ? hexAlpha(subject.color, 0.18)
            : "rgba(0,0,0,0.06)",
          minHeight: 168,
          padding: 20,
          opacity: subject.isLocked ? 0.5 : 1,
        }}
      >
        {/* Üst aksent çizgisi */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2.5,
            backgroundColor: subject.color,
            shadowColor: subject.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 8,
          }}
        />

        {/* Dekoratif arka plan görseli — sağ alt, büyük & soluk */}
        {img && (
          <Image
            source={img}
            style={{
              position: "absolute",
              right: -10,
              bottom: -10,
              width: 80,
              height: 80,
              borderRadius: 40,
              opacity: 0.1,
            }}
            resizeMode="cover"
          />
        )}

        {/* İkon + badge satırı */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 4,
          }}
        >
          <SubjectIconBox
            subject={subject}
            size={42}
            borderRadius={14}
            iconSize={20}
          />

          {subject.isLocked ? (
            <View
              style={{
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
                borderRadius: 8,
                padding: 5,
              }}
            >
              <Ionicons
                name="lock-closed"
                size={13}
                color={colors.textSecondary}
              />
            </View>
          ) : subject.isPremium ? (
            <View
              style={{
                backgroundColor: hexAlpha(subject.color, 0.14),
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 8,
                borderWidth: 0.5,
                borderColor: hexAlpha(subject.color, 0.35),
              }}
            >
              <Text
                style={{
                  color: subject.color,
                  fontSize: 8,
                  fontWeight: "800",
                  letterSpacing: 0.8,
                }}
              >
                PRO
              </Text>
            </View>
          ) : subject.progressPercent === 100 ? (
            <View
              style={{
                backgroundColor: "rgba(16,185,129,0.12)",
                borderRadius: 8,
                padding: 5,
                borderWidth: 0.5,
                borderColor: "rgba(16,185,129,0.25)",
              }}
            >
              <Ionicons name="checkmark" size={13} color="#10b981" />
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            fontSize: 13,
            fontWeight: "700",
            marginTop: 14,
            marginBottom: 3,
            letterSpacing: -0.1,
          }}
        >
          {subject.title}
        </Text>

        <Text
          style={{
            fontSize: 10,
            fontWeight: "500",
            marginBottom: 14,
            color: hexAlpha(subject.color, isDark ? 0.55 : 0.6),
          }}
        >
          {subject.completedTests}/{subject.totalTests} test
        </Text>

        {/* Progress bar */}
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: hexAlpha(subject.color, isDark ? 0.14 : 0.1),
            overflow: "visible",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${subject.progressPercent}%`,
              backgroundColor: subject.color,
              borderRadius: 2,
            }}
          >
            {subject.progressPercent > 0 && subject.progressPercent < 100 && (
              <View
                style={{
                  position: "absolute",
                  right: -2,
                  top: -2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: subject.color,
                  shadowColor: subject.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 6,
                }}
              />
            )}
          </View>
        </View>

        <Text
          style={{
            color: subject.color,
            fontSize: 12,
            fontWeight: "800",
            marginTop: 8,
            letterSpacing: -0.2,
          }}
        >
          {subject.progressPercent}%
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Featured Kart ────────────────────────────────────────────────────────────
function FeaturedCard({
  subject,
  isDark,
  colors,
  onPress,
}: {
  subject: SubjectWithProgress;
  isDark: boolean;
  colors: typeof DarkMode;
  onPress: () => void;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  const pressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 60,
        bounciness: 0,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 25,
        bounciness: 8,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [0.08, isDark ? 0.32 : 0.16],
  });

  const gradColors: [string, string, string] = isDark
    ? [
        hexAlpha(subject.color, 0.14),
        "rgba(20,20,22,0.0)",
        "rgba(20,20,22,0.0)",
      ]
    : [
        hexAlpha(subject.color, 0.08),
        "rgba(255,255,255,0.0)",
        "rgba(255,255,255,0.0)",
      ];

  const img = getSubjectImage(subject.title);

  return (
    <Animated.View
      style={{
        marginBottom: 12,
        opacity: enterAnim,
        transform: [
          {
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
          { scale: scaleAnim },
        ],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 32,
          shadowColor: subject.color,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity,
          shadowRadius: 28,
          elevation: 14,
        }}
      />

      <TouchableOpacity
        activeOpacity={1}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          playSound("click");
          onPress();
        }}
        style={{
          borderRadius: 32,
          overflow: "hidden",
          borderWidth: 0.5,
          borderColor: isDark
            ? hexAlpha(subject.color, 0.22)
            : "rgba(0,0,0,0.06)",
          backgroundColor: colors.bgCard,
        }}
      >
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 22 }}
        >
          {/* Üst aksent */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: subject.color,
              shadowColor: subject.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 10,
            }}
          />

          {/* Dekoratif arka plan görseli — sağ üst */}
          {img ? (
            <Image
              source={img}
              style={{
                position: "absolute",
                right: -15,
                top: -15,
                width: 140,
                height: 140,
                borderRadius: 70,
                opacity: 0.1,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                position: "absolute",
                right: -20,
                top: -10,
                opacity: 0.07,
              }}
            >
              <Ionicons
                name={subject.icon as any}
                size={130}
                color={subject.color}
              />
            </View>
          )}

          {/* İçerik */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <SubjectIconBox
              subject={subject}
              size={54}
              borderRadius={18}
              iconSize={26}
            />

            <View style={{ flex: 1, marginLeft: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: subject.color,
                  }}
                />
                <Text
                  style={{
                    color: hexAlpha(subject.color, 0.7),
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 2,
                  }}
                >
                  EN ÇOK ÇALIŞILAN
                </Text>
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "800",
                  letterSpacing: 0,
                  marginBottom: 2,
                }}
              >
                {subject.title}
              </Text>
              <Text
                style={{
                  color: hexAlpha(subject.color, 0.55),
                  fontSize: 11,
                  fontWeight: "500",
                }}
              >
                {subject.completedTests}/{subject.totalTests} test tamamlandı
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text
                style={{
                  color: subject.color,
                  fontSize: 30,
                  fontWeight: "800",
                  letterSpacing: -1.5,
                }}
              >
                {subject.progressPercent}%
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          </View>

          {/* Progress bar */}
          <View
            style={{
              marginTop: 18,
              height: 5,
              borderRadius: 3,
              backgroundColor: hexAlpha(subject.color, isDark ? 0.14 : 0.1),
              overflow: "visible",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${subject.progressPercent}%`,
                backgroundColor: subject.color,
                borderRadius: 3,
              }}
            >
              {subject.progressPercent > 0 && subject.progressPercent < 100 && (
                <View
                  style={{
                    position: "absolute",
                    right: -3,
                    top: -2.5,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: subject.color,
                    shadowColor: subject.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 8,
                  }}
                />
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────
export default function Subjects(): ReactElement {
  const theme = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const px = width < 375 ? 16 : 20;
  const gap = 10;
  const cardWidth = (width - px * 2 - gap) / 2;

  const loadSubjects = useCallback(async () => {
    try {
      await db.initialize();
      const stats = await db.getOverallStats();
      const enriched: SubjectWithProgress[] = await Promise.all(
        stats.subjectStats.map(async (s) => {
          const tests = await db.getTestsBySubject(s.subjectId);
          const totalTests = tests.length;
          const progressMap = await db.getProgressBySubject(s.subjectId);
          let completedTests = 0;
          progressMap.forEach((p) => {
            if (p.isCompleted) completedTests++;
          });
          return {
            id: s.subjectId,
            title: s.title,
            color: s.color,
            icon: s.icon,
            progressPercent:
              totalTests > 0
                ? Math.round((completedTests / totalTests) * 100)
                : 0,
            correctCount: s.correctCount,
            wrongCount: s.wrongCount,
            completedTests,
            totalTests,
            ...SUBJECT_META[s.subjectId],
          };
        }),
      );
      setSubjects(enriched);
    } catch (err) {
      console.error("Subjects yüklenemedi:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadSubjects();
    }, [loadSubjects]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSubjects();
  };

  if (!theme) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0E" }}>
        <Text style={{ color: "#ECEEF2" }}>Loading...</Text>
      </View>
    );
  }

  const { isDark } = theme;
  const colors = isDark ? DarkMode : LightMode;

  const featuredSubject =
    subjects.length > 0
      ? ([...subjects]
          .filter((s) => !s.isLocked)
          .sort((a, b) => b.progressPercent - a.progressPercent)[0] ??
        subjects[0])
      : null;
  const gridSubjects = subjects.filter((s) => s.id !== featuredSubject?.id);

  const rows: SubjectWithProgress[][] = [];
  for (let i = 0; i < gridSubjects.length; i += 2)
    rows.push(gridSubjects.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 60,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── HEADER ── */}
        <View
          style={{
            paddingHorizontal: px,
            paddingTop: 16,
            paddingBottom: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 2.5,
              marginBottom: 5,
            }}
          >
            KATEGORİLER
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: "800",
              letterSpacing: 0,
            }}
          >
            Konular
          </Text>
        </View>

        <View style={{ paddingHorizontal: px, paddingTop: 20 }}>
          {isLoading ? (
            <>
              <View style={{ marginBottom: 12 }}>
                <SkeletonCard
                  isDark={isDark}
                  width={width - px * 2}
                  height={140}
                />
              </View>
              <View style={{ flexDirection: "row", gap }}>
                <SkeletonCard isDark={isDark} width={cardWidth} />
                <SkeletonCard isDark={isDark} width={cardWidth} />
              </View>
            </>
          ) : subjects.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 80, gap: 12 }}>
              <Ionicons
                name="book-outline"
                size={44}
                color={colors.textSecondary}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Konu bulunamadı.
              </Text>
            </View>
          ) : (
            <>
              {featuredSubject && (
                <FeaturedCard
                  subject={featuredSubject}
                  isDark={isDark}
                  colors={colors}
                  onPress={() =>
                    router.push({
                      pathname: "/tests/testlist",
                      params: {
                        id: featuredSubject.id,
                        title: featuredSubject.title,
                        color: featuredSubject.color,
                      },
                    })
                  }
                />
              )}

              {rows.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={{ flexDirection: "row", gap, marginBottom: gap }}
                >
                  {row.map((subject, colIdx) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      index={rowIdx * 2 + colIdx + 1}
                      isDark={isDark}
                      colors={colors}
                      width={cardWidth}
                      onPress={() =>
                        router.push({
                          pathname: "/tests/testlist",
                          params: {
                            id: subject.id,
                            title: subject.title,
                            color: subject.color,
                          },
                        })
                      }
                    />
                  ))}
                  {row.length === 1 && <View style={{ width: cardWidth }} />}
                </View>
              ))}
            </>
          )}

          {/* ── Kilitli içerik notu ── */}
          {!isLoading && subjects.some((s) => s.isLocked) && (
            <View
              style={{
                marginTop: 8,
                padding: 16,
                backgroundColor: isDark
                  ? "rgba(20,20,22,0.9)"
                  : "rgba(255,255,255,0.9)",
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "#f0f2f5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: "700",
                    marginBottom: 2,
                  }}
                >
                  Premium İçerik
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  Kilitli konulara erişmek için Pro üyeliğe geç.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
