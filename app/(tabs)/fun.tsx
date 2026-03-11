// app/(tabs)/fun.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur"; // oyun header'ında kullanılıyor
import * as Haptics from "expo-haptics";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";

import CandyGame from "../../components/games/CandyGame";
import MatchingGame from "../../components/games/MatchingWord";
import ReactionGame from "../../components/games/ReactionGame";
import {
  DarkMode,
  GAMES,
  GameId,
  LightMode,
} from "../../components/games/gameTypes";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
type Screen = { screen: "hub" } | { screen: "game"; gameId: GameId };

// ── Tek Dalga Çizgisi ─────────────────────────────────────────────────────────
function WaveLine({
  color,
  yBase,
  duration,
  amplitude,
  delay = 0,
}: {
  color: string;
  yBase: number;
  duration: number;
  amplitude: number;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
  }, [anim, duration, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, amplitude, 0, -amplitude, 0],
  });

  const segments = 7;
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: yBase,
        left: -SCREEN_W * 0.1,
        flexDirection: "row",
        alignItems: "center",
        transform: [{ translateY }],
      }}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <View
          key={i}
          style={{
            width: SCREEN_W * 0.18,
            height: 1.5,
            borderRadius: 1,
            backgroundColor: color,
            marginRight: SCREEN_W * 0.015,
            opacity: 1 - i * 0.1,
          }}
        />
      ))}
    </Animated.View>
  );
}

// ── Arka Plan Dalga Dekoru ────────────────────────────────────────────────────
function BackgroundDecor({ isDark }: { isDark: boolean }) {
  const waves = [
    {
      color: GAMES[0]?.color ?? "#ff6b6b",
      yBase: SCREEN_H * 0.12,
      duration: 5000,
      amplitude: 14,
      delay: 0,
      opacity: 0.35,
    },
    {
      color: GAMES[0]?.color ?? "#ff6b6b",
      yBase: SCREEN_H * 0.18,
      duration: 6200,
      amplitude: 10,
      delay: 800,
      opacity: 0.18,
    },
    {
      color: GAMES[1]?.color ?? "#00e5ff",
      yBase: SCREEN_H * 0.38,
      duration: 4500,
      amplitude: 18,
      delay: 400,
      opacity: 0.3,
    },
    {
      color: GAMES[1]?.color ?? "#00e5ff",
      yBase: SCREEN_H * 0.45,
      duration: 7000,
      amplitude: 8,
      delay: 1200,
      opacity: 0.15,
    },
    {
      color: GAMES[2]?.color ?? "#a78bfa",
      yBase: SCREEN_H * 0.65,
      duration: 5500,
      amplitude: 16,
      delay: 600,
      opacity: 0.28,
    },
    {
      color: GAMES[2]?.color ?? "#a78bfa",
      yBase: SCREEN_H * 0.72,
      duration: 4000,
      amplitude: 12,
      delay: 0,
      opacity: 0.14,
    },
    {
      color: GAMES[1]?.color ?? "#00e5ff",
      yBase: SCREEN_H * 0.88,
      duration: 6800,
      amplitude: 10,
      delay: 300,
      opacity: 0.2,
    },
  ];

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
      pointerEvents="none"
    >
      {waves.map((w, i) => (
        <View key={i} style={{ opacity: w.opacity }}>
          <WaveLine
            color={w.color}
            yBase={w.yBase}
            duration={w.duration}
            amplitude={w.amplitude}
            delay={w.delay}
          />
        </View>
      ))}
      {/* Genel karartma overlay */}
      <View
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: isDark
            ? "rgba(8,8,12,0.82)"
            : "rgba(240,242,248,0.85)",
        }}
      />
    </View>
  );
}

// ── Büyük Hero Kart (ilk oyun) ────────────────────────────────────────────────
function HeroCard({
  game,
  isDark,
  onPress,
}: {
  game: (typeof GAMES)[0];
  isDark: boolean;
  onPress: () => void;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 550,
      delay: 80,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  return (
    <Animated.View
      style={{
        marginBottom: 12,
        opacity: enterAnim,
        transform: [
          {
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [40, 0],
            }),
          },
          { scale: pressScale },
        ],
        shadowColor: game.color,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: isDark ? 0.4 : 0.22,
        shadowRadius: 32,
        elevation: 10,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Animated.spring(pressScale, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 8,
          }).start();
        }}
        onPress={onPress}
        style={{
          borderRadius: 28,
          overflow: "hidden",
          backgroundColor: isDark
            ? "rgba(18,18,24,0.9)"
            : "rgba(255,255,255,0.9)",
          borderWidth: 0.5,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        }}
      >
        {/* Üst aksent şerit */}
        <View
          style={{
            height: 3,
            backgroundColor: game.color,
            shadowColor: game.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
          }}
        />

        <View style={{ padding: 24 }}>
          {/* Hero resim — büyük thumbnail */}
          <View
            style={{
              marginBottom: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 26,
                backgroundColor: game.color + "20",
                overflow: "hidden",
                transform: [{ rotate: "-6deg" }],
                borderWidth: 1,
                borderColor: game.color + "35",
              }}
            >
              {game.image ? (
                <Image
                  source={game.image}
                  style={{
                    width: "100%",
                    height: "100%",
                    transform: [{ rotate: "6deg" }, { scale: 1.1 }],
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{
                    fontSize: 42,
                    textAlign: "center",
                    lineHeight: 80,
                    transform: [{ rotate: "6deg" }],
                  }}
                >
                  {game.emoji}
                </Text>
              )}
            </View>

            {/* Sağ üst: "YENİ" badge */}
            <View
              style={{
                backgroundColor: game.color,
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 10,
                shadowColor: game.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: "900",
                  letterSpacing: 1.5,
                }}
              >
                POPÜLER
              </Text>
            </View>
          </View>

          <Text
            style={{
              color: isDark ? "#ECEEF2" : "#0f0f14",
              fontSize: 24,
              fontWeight: "900",
              letterSpacing: -0.8,
              marginBottom: 8,
            }}
          >
            {game.label}
          </Text>
          <Text
            style={{
              color: isDark ? "rgba(180,185,200,0.7)" : "rgba(60,65,80,0.7)",
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {game.desc}
          </Text>

          {/* CTA butonu */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                backgroundColor: game.color,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                shadowColor: game.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.45,
                shadowRadius: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
                Hemen Oyna
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>

            <Text
              style={{
                color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              01
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Küçük Bento Kart (yan yana) ───────────────────────────────────────────────
function SmallCard({
  game,
  index,
  isDark,
  onPress,
}: {
  game: (typeof GAMES)[0];
  index: number;
  isDark: boolean;
  onPress: () => void;
}) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const tilt = index % 2 === 0 ? "-2deg" : "1.5deg";

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 480,
      delay: 200 + index * 100,
      easing: Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }).start();
  }, [enterAnim, index]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: enterAnim,
        transform: [
          {
            translateY: enterAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }),
          },
          { scale: pressScale },
        ],
        shadowColor: game.color,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.3 : 0.15,
        shadowRadius: 20,
        elevation: 6,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Animated.spring(pressScale, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 60,
            bounciness: 0,
          }).start();
        }}
        onPressOut={() => {
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 8,
          }).start();
        }}
        onPress={onPress}
        style={{
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: isDark
            ? "rgba(18,18,24,0.9)"
            : "rgba(255,255,255,0.9)",
          borderWidth: 0.5,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          minHeight: 160,
          padding: 20,
        }}
      >
        {/* Sol dikey aksent şerit */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: 3,
            backgroundColor: game.color,
            shadowColor: game.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 5,
          }}
        />

        {/* Resim thumbnail — döndürülmüş */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: game.color + "18",
            overflow: "hidden",
            marginBottom: 14,
            transform: [{ rotate: tilt }],
            borderWidth: 1,
            borderColor: game.color + "30",
          }}
        >
          {game.image ? (
            <Image
              source={game.image}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 28, textAlign: "center", lineHeight: 56 }}>
              {game.emoji}
            </Text>
          )}
        </View>

        <Text
          style={{
            color: isDark ? "#ECEEF2" : "#0f0f14",
            fontSize: 15,
            fontWeight: "800",
            letterSpacing: -0.4,
            marginBottom: 6,
          }}
          numberOfLines={1}
        >
          {game.label}
        </Text>
        <Text
          style={{
            color: isDark ? "rgba(160,165,180,0.65)" : "rgba(60,65,80,0.65)",
            fontSize: 12,
            lineHeight: 17,
          }}
          numberOfLines={2}
        >
          {game.desc}
        </Text>

        {/* Alt sıra numara */}
        <Text
          style={{
            position: "absolute",
            bottom: 14,
            right: 16,
            color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
            fontSize: 28,
            fontWeight: "900",
            letterSpacing: -1,
          }}
        >
          0{index + 2}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Hub Ekranı ────────────────────────────────────────────────────────────────
function HubScreen({
  colors,
  insets,
  isDark,
  onSelect,
}: {
  colors: typeof LightMode;
  insets: ReturnType<typeof useSafeAreaInsets>;
  isDark: boolean;
  onSelect: (id: GameId) => void;
}) {
  const heroGame = GAMES[0];
  const smallGames = GAMES.slice(1);

  return (
    <View style={{ flex: 1 }}>
      <BackgroundDecor isDark={isDark} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 110,
          paddingHorizontal: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 4,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            Eğlence Merkezi
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                color: isDark ? "#ECEEF2" : "#0f0f14",
                fontSize: 32,
                fontWeight: "900",
                letterSpacing: -1.2,
                lineHeight: 36,
              }}
            >
              Oyun{"\n"}Merkezi 🎮
            </Text>
            {/* Glow bar dikey */}
            <View style={{ gap: 5, alignItems: "flex-end" }}>
              {GAMES.map((g) => (
                <View
                  key={g.id}
                  style={{
                    width: 28,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: g.color,
                    shadowColor: g.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 5,
                  }}
                />
              ))}
            </View>
          </View>
          <Text
            style={{
              color: isDark ? "rgba(160,165,180,0.55)" : "rgba(60,65,80,0.55)",
              fontSize: 13,
              marginTop: 10,
            }}
          >
            Bir oyun seç ve oynamaya başla!
          </Text>
        </View>

        {/* Hero kart — büyük */}
        {heroGame && (
          <HeroCard
            game={heroGame}
            isDark={isDark}
            onPress={() => onSelect(heroGame.id)}
          />
        )}

        {/* Bento Grid — küçük kartlar yan yana */}
        {smallGames.length > 0 && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 0 }}>
            {smallGames.map((game, i) => (
              <SmallCard
                key={game.id}
                game={game}
                index={i}
                isDark={isDark}
                onPress={() => onSelect(game.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────
export default function FunScreen() {
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const isDark = theme?.isDark ?? true;
  const colors = isDark ? DarkMode : LightMode;

  const [nav, setNav] = useState<Screen>({ screen: "hub" });

  const goBack = () => setNav({ screen: "hub" });
  const goGame = (gameId: GameId) => setNav({ screen: "game", gameId });

  if (nav.screen === "hub") {
    return (
      <View
        style={{ flex: 1, backgroundColor: isDark ? "#08080c" : "#f0f2f8" }}
      >
        <HubScreen
          colors={colors}
          insets={insets}
          isDark={isDark}
          onSelect={goGame}
        />
      </View>
    );
  }

  const gameId = nav.screen === "game" ? nav.gameId : ("" as GameId);
  const gameColor =
    GAMES.find((g) => (g.id as string) === (gameId as string))?.color ??
    colors.accent;
  const isCandy = (gameId as string) === "candy";

  return (
    <View style={{ flex: 1, backgroundColor: isCandy ? "#0f1f3d" : colors.bg }}>
      {/* Üst bar — BlurView */}
      <BlurView
        intensity={isDark ? 50 : 80}
        tint={isDark ? "dark" : "light"}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: isCandy
            ? "#1e3a6e"
            : isDark
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.06)",
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          style={{
            width: 38,
            height: 38,
            borderRadius: 13,
            backgroundColor: gameColor + "20",
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 0.5,
            borderColor: gameColor + "40",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={gameColor} />
        </TouchableOpacity>
        <Text
          style={{
            color: isCandy ? "#fff" : isDark ? "#ECEEF2" : "#111318",
            fontWeight: "800",
            fontSize: 16,
            letterSpacing: -0.4,
            flex: 1,
          }}
        >
          {GAMES.find((g) => (g.id as string) === (gameId as string))?.label}
        </Text>
        {/* Glow nokta */}
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: gameColor,
            shadowColor: gameColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 7,
          }}
        />
      </BlurView>

      <View style={{ flex: 1, paddingTop: isCandy ? 0 : 16 }}>
        {(gameId as string) === "matching" && (
          <MatchingGame colors={colors} insets={insets} />
        )}
        {(gameId as string) === "reaction" && (
          <ReactionGame colors={colors} insets={insets} />
        )}
        {(gameId as string) === "candy" && (
          <CandyGame colors={colors} insets={insets} />
        )}
      </View>
    </View>
  );
}
