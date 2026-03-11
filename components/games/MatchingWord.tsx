// components/games/MatchingGame.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    MatchingPair,
    MatchingType,
    matchingDB,
} from "../../services/MatchingDataManager";
import { GameProps } from "./gameTypes";

// ─── Renkler ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#07111f",
  surface: "#0d1e33",
  border: "#1a3050",
  accent: "#38bdf8",
  accentDim: "#1a4a6b",
  correct: "#22c55e",
  wrong: "#ef4444",
  gold: "#fbbf24",
  text: "#f0f9ff",
  textDim: "#64748b",
  leftBg: "#0f2035",
  rightBg: "#0f2035",
  selectedL: "#1e4976",
  selectedR: "#1a4a2e",
};

const PAIR_COUNT = 6;
const ROUND_SECONDS = 60;

// ─── Tipler ───────────────────────────────────────────────────────────────────
type GamePhase = "category" | "playing" | "result";

interface AnimMap {
  [id: string]: Animated.Value;
}

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function formatTime(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// KATEGORI SEÇİM EKRANI
// ═════════════════════════════════════════════════════════════════════════════
function CategoryScreen({
  onSelect,
  onMixed,
}: {
  onSelect: (cat: string, type: MatchingType | null) => void;
  onMixed: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await matchingDB.initialize();
      const cats = await matchingDB.getCategories();
      setCategories(cats);
      setLoading(false);
    })();
  }, []);

  const types: (MatchingType | null)[] = [
    null,
    "olay_tarih",
    "kisi_olay",
    "kavram_tanim",
    "donem_ozellik",
  ];
  const typeLabels: Record<string, string> = {
    null: "Tümü",
    olay_tarih: "Olay ↔ Tarih",
    kisi_olay: "Kişi ↔ Olay",
    kavram_tanim: "Kavram ↔ Tanım",
    donem_ozellik: "Dönem ↔ Özellik",
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              color: C.textDim,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 3,
              marginBottom: 6,
            }}
          >
            EŞLEŞTİRME OYUNU
          </Text>
          <Text
            style={{
              color: C.text,
              fontSize: 26,
              fontWeight: "900",
              letterSpacing: -0.5,
            }}
          >
            Kategori Seç 🎯
          </Text>
          <Text style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>
            6 çift • 60 saniye • Sol → Sağ eşleştir
          </Text>
        </View>

        {/* Karışık Mod */}
        <TouchableOpacity
          onPress={onMixed}
          style={{
            backgroundColor: C.accent + "22",
            borderRadius: 16,
            borderWidth: 2,
            borderColor: C.accent,
            padding: 18,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: C.accent + "33",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 24 }}>🔀</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.accent, fontSize: 16, fontWeight: "800" }}>
              Karışık Mod
            </Text>
            <Text style={{ color: C.textDim, fontSize: 12, marginTop: 2 }}>
              Tüm kategorilerden rastgele sorular
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.accent} />
        </TouchableOpacity>

        {/* Kategori seçildi → tip seç */}
        {selectedCat && (
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <TouchableOpacity onPress={() => setSelectedCat(null)}>
                <Ionicons
                  name="arrow-back-circle"
                  size={22}
                  color={C.textDim}
                />
              </TouchableOpacity>
              <Text
                style={{
                  color: C.text,
                  fontSize: 14,
                  fontWeight: "700",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {selectedCat}
              </Text>
            </View>
            <Text style={{ color: C.textDim, fontSize: 12, marginBottom: 10 }}>
              Soru tipini seç:
            </Text>
            {types.map((t) => (
              <TouchableOpacity
                key={String(t)}
                onPress={() => onSelect(selectedCat, t)}
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.border,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{ color: C.text, fontSize: 14, fontWeight: "600" }}
                >
                  {typeLabels[String(t)]}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Kategori listesi */}
        {!selectedCat && (
          <>
            <Text
              style={{
                color: C.textDim,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1.5,
                marginBottom: 10,
              }}
            >
              KATEGORİLER
            </Text>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <View
                    key={i}
                    style={{
                      height: 64,
                      backgroundColor: C.surface,
                      borderRadius: 12,
                      marginBottom: 8,
                      opacity: 0.4,
                    }}
                  />
                ))
              : categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCat(cat)}
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      padding: 14,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: C.accentDim,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="bookmark-outline"
                        size={18}
                        color={C.accent}
                      />
                    </View>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 13,
                        fontWeight: "600",
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {cat}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={C.textDim}
                    />
                  </TouchableOpacity>
                ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OYUN EKRANI
// ═════════════════════════════════════════════════════════════════════════════
function GameScreen({
  pairs,
  timeLeft,
  score,
  correct,
  wrong,
  selectedLeft,
  selectedRight,
  matchedIds,
  wrongPair,
  onSelectLeft,
  onSelectRight,
  onGiveUp,
  shakeAnims,
  flashAnims,
}: {
  pairs: MatchingPair[];
  timeLeft: number;
  score: number;
  correct: number;
  wrong: number;
  selectedLeft: number | null;
  selectedRight: number | null;
  matchedIds: Set<number>;
  wrongPair: { left: number; right: number } | null;
  onSelectLeft: (id: number) => void;
  onSelectRight: (id: number) => void;
  onGiveUp: () => void;
  shakeAnims: AnimMap;
  flashAnims: AnimMap;
}) {
  const insets = useSafeAreaInsets();

  const leftItems = pairs.map((p) => ({ id: p.id, text: p.left }));
  // Sağ listeyi bir kez karıştır, pairs değişince yeniden oluştur
  const rightItems = useRef<{ id: number; text: string }[]>([]);
  if (rightItems.current.length !== pairs.length) {
    rightItems.current = [...pairs]
      .sort(() => Math.random() - 0.5)
      .map((p) => ({ id: p.id, text: p.right }));
  }

  const timerColor =
    timeLeft <= 10 ? C.wrong : timeLeft <= 20 ? C.gold : C.accent;
  const progress = timeLeft / ROUND_SECONDS;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          {/* D/Y */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View
              style={{
                backgroundColor: C.correct + "22",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text
                style={{ color: C.correct, fontSize: 13, fontWeight: "800" }}
              >
                ✓ {correct}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: C.wrong + "22",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 10,
              }}
            >
              <Text style={{ color: C.wrong, fontSize: 13, fontWeight: "800" }}>
                ✗ {wrong}
              </Text>
            </View>
          </View>

          {/* Skor */}
          <Text
            style={{
              color: C.text,
              fontSize: 28,
              fontWeight: "900",
              letterSpacing: -1,
            }}
          >
            {score}
          </Text>

          {/* Bitir */}
          <TouchableOpacity
            onPress={onGiveUp}
            style={{
              backgroundColor: C.surface,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ color: C.textDim, fontSize: 12, fontWeight: "700" }}>
              Bitir
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer bar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{
              flex: 1,
              height: 6,
              backgroundColor: C.border,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: timerColor,
                borderRadius: 3,
              }}
            />
          </View>
          <Text
            style={{
              color: timerColor,
              fontSize: 14,
              fontWeight: "900",
              minWidth: 44,
              textAlign: "right",
            }}
          >
            {formatTime(timeLeft)}
          </Text>
        </View>

        <Text
          style={{
            color: C.textDim,
            fontSize: 11,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          {matchedIds.size} / {PAIR_COUNT} eşleşti
        </Text>
      </View>

      {/* ── İki Kolon ── */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          paddingHorizontal: 12,
          gap: 8,
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* SOL */}
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              color: C.textDim,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            KAVRAM
          </Text>
          {leftItems.map((item) => {
            const matched = matchedIds.has(item.id);
            const selected = selectedLeft === item.id;
            const isWrong = wrongPair?.left === item.id;
            return (
              <Animated.View
                key={item.id}
                style={{
                  transform: [
                    {
                      translateX:
                        shakeAnims[`l${item.id}`] ?? new Animated.Value(0),
                    },
                  ],
                  opacity: flashAnims[`l${item.id}`] ?? new Animated.Value(1),
                }}
              >
                <TouchableOpacity
                  onPress={() => !matched && onSelectLeft(item.id)}
                  activeOpacity={0.75}
                  disabled={matched}
                  style={{
                    backgroundColor: matched
                      ? C.correct + "18"
                      : selected
                        ? C.selectedL
                        : isWrong
                          ? C.wrong + "22"
                          : C.leftBg,
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: matched
                      ? C.correct + "55"
                      : selected
                        ? C.accent
                        : isWrong
                          ? C.wrong
                          : C.border,
                    padding: 10,
                    minHeight: 56,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {matched ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={C.correct}
                    />
                  ) : (
                    <Text
                      style={{
                        color: isWrong ? C.wrong : C.text,
                        fontSize: 12,
                        fontWeight: selected ? "700" : "500",
                        textAlign: "center",
                        lineHeight: 17,
                      }}
                      numberOfLines={3}
                    >
                      {item.text}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Orta ayırıcı */}
        <View
          style={{ width: 1, backgroundColor: C.border, marginVertical: 30 }}
        />

        {/* SAĞ */}
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            style={{
              color: C.textDim,
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            KARŞILIĞI
          </Text>
          {rightItems.current.map((item) => {
            const matched = matchedIds.has(item.id);
            const selected = selectedRight === item.id;
            const isWrong = wrongPair?.right === item.id;
            return (
              <Animated.View
                key={item.id}
                style={{
                  transform: [
                    {
                      translateX:
                        shakeAnims[`r${item.id}`] ?? new Animated.Value(0),
                    },
                  ],
                  opacity: flashAnims[`r${item.id}`] ?? new Animated.Value(1),
                }}
              >
                <TouchableOpacity
                  onPress={() => !matched && onSelectRight(item.id)}
                  activeOpacity={0.75}
                  disabled={matched}
                  style={{
                    backgroundColor: matched
                      ? C.correct + "18"
                      : selected
                        ? C.selectedR
                        : isWrong
                          ? C.wrong + "22"
                          : C.rightBg,
                    borderRadius: 12,
                    borderWidth: selected ? 2 : 1,
                    borderColor: matched
                      ? C.correct + "55"
                      : selected
                        ? C.correct
                        : isWrong
                          ? C.wrong
                          : C.border,
                    padding: 10,
                    minHeight: 56,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {matched ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={C.correct}
                    />
                  ) : (
                    <Text
                      style={{
                        color: isWrong ? C.wrong : C.text,
                        fontSize: 12,
                        fontWeight: selected ? "700" : "500",
                        textAlign: "center",
                        lineHeight: 17,
                      }}
                      numberOfLines={3}
                    >
                      {item.text}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SONUÇ EKRANI
// ═════════════════════════════════════════════════════════════════════════════
function ResultScreen({
  correct,
  wrong,
  score,
  duration,
  category,
  onPlayAgain,
  onChangeCategory,
}: {
  correct: number;
  wrong: number;
  score: number;
  duration: number;
  category: string | null;
  onPlayAgain: () => void;
  onChangeCategory: () => void;
}) {
  const insets = useSafeAreaInsets();
  const accuracy =
    PAIR_COUNT > 0 ? Math.round((correct / PAIR_COUNT) * 100) : 0;

  const emoji =
    accuracy === 100
      ? "🏆"
      : accuracy >= 70
        ? "🎉"
        : accuracy >= 40
          ? "👍"
          : "💪";
  const scoreColor =
    accuracy >= 70 ? C.correct : accuracy >= 40 ? C.gold : C.wrong;

  // ── Animasyonlar (useRef ile, dependency array'e gerek yok) ──
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0,
        damping: 14,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
    // fadeIn ve slideY useRef ile sabit referanslardır, ESLint'e eslint-disable ile bildiriyoruz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center" }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 24,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            width: "100%",
            opacity: fadeIn,
            transform: [{ translateY: slideY }],
          }}
        >
          <Text
            style={{
              color: C.textDim,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 3,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            TUR SONU
          </Text>

          {/* Büyük daire */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                width: 150,
                height: 150,
                borderRadius: 75,
                borderWidth: 5,
                borderColor: scoreColor,
                backgroundColor: C.surface,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 44 }}>{emoji}</Text>
              <Text
                style={{
                  color: scoreColor,
                  fontSize: 22,
                  fontWeight: "900",
                  marginTop: 2,
                }}
              >
                %{accuracy}
              </Text>
            </View>
          </View>

          {/* İstatistik kartları */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginBottom: 14,
              width: "100%",
            }}
          >
            {[
              {
                label: "Doğru",
                value: correct,
                color: C.correct,
                icon: "checkmark-circle",
              },
              {
                label: "Yanlış",
                value: wrong,
                color: C.wrong,
                icon: "close-circle",
              },
              { label: "Skor", value: score, color: C.gold, icon: "star" },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: C.surface,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: stat.color + "44",
                }}
              >
                <Ionicons
                  name={stat.icon as any}
                  size={24}
                  color={stat.color}
                />
                <Text
                  style={{
                    color: stat.color,
                    fontSize: 24,
                    fontWeight: "900",
                    marginTop: 6,
                  }}
                >
                  {stat.value}
                </Text>
                <Text style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Süre + kategori */}
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 32,
              width: "100%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: C.textDim, fontSize: 13 }}>Süre</Text>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: "700" }}>
                {formatTime(duration)}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: C.textDim, fontSize: 13 }}>Kategori</Text>
              <Text
                style={{
                  color: C.text,
                  fontSize: 13,
                  fontWeight: "700",
                  maxWidth: "60%",
                  textAlign: "right",
                }}
                numberOfLines={1}
              >
                {category ?? "Karışık"}
              </Text>
            </View>
          </View>

          {/* Butonlar */}
          <TouchableOpacity
            onPress={onPlayAgain}
            style={{
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
              width: "100%",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>
              Tekrar Oyna →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onChangeCategory}
            style={{
              backgroundColor: C.surface,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              borderWidth: 1,
              borderColor: C.border,
              width: "100%",
            }}
          >
            <Text style={{ color: C.textDim, fontSize: 15, fontWeight: "600" }}>
              Kategori Değiştir
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ANA COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function MatchingGame({
  colors: _colors,
  insets: _insets,
}: GameProps) {
  const [phase, setPhase] = useState<GamePhase>("category");
  const [pairs, setPairs] = useState<MatchingPair[]>([]);
  const [sessionId, setSessionId] = useState<number>(0);
  const [category, setCategory] = useState<string | null>(null);
  const [gameType, setGameType] = useState<MatchingType | null>(null);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<{
    left: number;
    right: number;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [elapsed, setElapsed] = useState(0);

  // ── Animasyon map'leri — ref olarak sabit ──────────────────────────────
  const shakeAnims = useRef<AnimMap>({}).current;
  const flashAnims = useRef<AnimMap>({}).current;

  const getShake = useCallback(
    (key: string) => {
      if (!shakeAnims[key]) shakeAnims[key] = new Animated.Value(0);
      return shakeAnims[key];
    },
    [shakeAnims],
  );

  const getFlash = useCallback(
    (key: string) => {
      if (!flashAnims[key]) flashAnims[key] = new Animated.Value(1);
      return flashAnims[key];
    },
    [flashAnims],
  );

  // ── Timer ────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // finishGame'i ref ile tut, timer içinde stale closure olmaz
  const finishGameRef = useRef<(allMatched: boolean) => Promise<void>>(() =>
    Promise.resolve(),
  );

  const startTimer = useCallback(() => {
    stopTimer();
    startedAt.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          finishGameRef.current(false);
          return 0;
        }
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // ── Oyun başlatma ────────────────────────────────────────────────────────
  const startGame = useCallback(
    async (cat: string | null, typ: MatchingType | null) => {
      stopTimer();
      setCategory(cat);
      setGameType(typ);

      await matchingDB.initialize();
      const fetched = await matchingDB.getRandomPairs(PAIR_COUNT, cat, typ);
      const finalPairs =
        fetched.length < PAIR_COUNT
          ? await matchingDB.getRandomPairs(PAIR_COUNT, null, null)
          : fetched;

      setPairs(finalPairs);

      finalPairs.forEach((p) => {
        getShake(`l${p.id}`).setValue(0);
        getShake(`r${p.id}`).setValue(0);
        getFlash(`l${p.id}`).setValue(1);
        getFlash(`r${p.id}`).setValue(1);
      });

      const sid = await matchingDB.startSession(PAIR_COUNT, cat, typ);
      setSessionId(sid);
      setSelectedLeft(null);
      setSelectedRight(null);
      setMatchedIds(new Set());
      setWrongPair(null);
      setScore(0);
      setCorrect(0);
      setWrong(0);
      setTimeLeft(ROUND_SECONDS);
      setElapsed(0);
      setPhase("playing");

      setTimeout(startTimer, 100);
    },
    [stopTimer, startTimer, getShake, getFlash],
  );

  // ── Oyun bitişi ──────────────────────────────────────────────────────────
  const finishGame = useCallback(
    async (_allMatched: boolean) => {
      stopTimer();
      const dur = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(dur);
      // correct/wrong burada closure'da sabit — sessionId de
      setCorrect((c) => {
        setWrong((w) => {
          matchingDB.completeSession(sessionId, c, w, dur).catch(console.error);
          return w;
        });
        return c;
      });
      setPhase("result");
    },
    [stopTimer, sessionId],
  );

  // finishGameRef'i her render'da güncelle
  useEffect(() => {
    finishGameRef.current = finishGame;
  }, [finishGame]);

  // ── Seçim handlers ───────────────────────────────────────────────────────
  const handleSelectLeft = useCallback((id: number) => {
    setSelectedLeft((prev) => (prev === id ? null : id));
    setWrongPair(null);
  }, []);

  const handleSelectRight = useCallback((id: number) => {
    setSelectedRight((prev) => (prev === id ? null : id));
    setWrongPair(null);
  }, []);

  // ── Eşleştirme kontrolü ──────────────────────────────────────────────────
  useEffect(() => {
    if (selectedLeft === null || selectedRight === null) return;

    const isMatch = selectedLeft === selectedRight;

    if (isMatch) {
      const lKey = `l${selectedLeft}`;
      const rKey = `r${selectedRight}`;

      // Seçili id'leri closure'da yakala
      const matchedId = selectedLeft;

      setCorrect((c) => {
        const newCorrect = c + 1;
        setTimeLeft((t) => {
          const bonus = 10 + Math.max(0, t - 10);
          setScore((s) => s + bonus);
          return t;
        });
        setSessionId((sid) => {
          setElapsed((el) => {
            setWrong((w) => {
              matchingDB
                .updateSession(sid, newCorrect, w, el)
                .catch(console.error);
              return w;
            });
            return el;
          });
          return sid;
        });
        return newCorrect;
      });

      // Flash animasyonu
      const flashSeq = (key: string) =>
        Animated.sequence([
          Animated.timing(getFlash(key), {
            toValue: 0.3,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(getFlash(key), {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(getFlash(key), {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      flashSeq(lKey);
      flashSeq(rKey);

      setMatchedIds((prev) => {
        const next = new Set(prev);
        next.add(matchedId);
        if (next.size === PAIR_COUNT) {
          setTimeout(() => finishGameRef.current(true), 400);
        }
        return next;
      });
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Yanlış
      const lKey = `l${selectedLeft}`;
      const rKey = `r${selectedRight}`;
      const snapLeft = selectedLeft;
      const snapRight = selectedRight;

      setWrong((w) => {
        const newWrong = w + 1;
        setSessionId((sid) => {
          setElapsed((el) => {
            setCorrect((c) => {
              matchingDB
                .updateSession(sid, c, newWrong, el)
                .catch(console.error);
              return c;
            });
            return el;
          });
          return sid;
        });
        return newWrong;
      });
      setScore((s) => Math.max(0, s - 5));
      setWrongPair({ left: snapLeft, right: snapRight });

      // Shake animasyonu
      const shakeSeq = (key: string) =>
        Animated.sequence([
          Animated.timing(getShake(key), {
            toValue: 8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(getShake(key), {
            toValue: -8,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(getShake(key), {
            toValue: 6,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(getShake(key), {
            toValue: -6,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(getShake(key), {
            toValue: 0,
            duration: 40,
            useNativeDriver: true,
          }),
        ]).start();
      shakeSeq(lKey);
      shakeSeq(rKey);

      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setWrongPair(null);
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeft, selectedRight]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (phase === "category") {
    return (
      <CategoryScreen
        onSelect={(cat, typ) => startGame(cat, typ)}
        onMixed={() => startGame(null, null)}
      />
    );
  }

  if (phase === "result") {
    return (
      <ResultScreen
        correct={correct}
        wrong={wrong}
        score={score}
        duration={elapsed}
        category={category}
        onPlayAgain={() => startGame(category, gameType)}
        onChangeCategory={() => setPhase("category")}
      />
    );
  }

  return (
    <GameScreen
      pairs={pairs}
      timeLeft={timeLeft}
      score={score}
      correct={correct}
      wrong={wrong}
      selectedLeft={selectedLeft}
      selectedRight={selectedRight}
      matchedIds={matchedIds}
      wrongPair={wrongPair}
      onSelectLeft={handleSelectLeft}
      onSelectRight={handleSelectRight}
      onGiveUp={() => finishGame(false)}
      shakeAnims={shakeAnims}
      flashAnims={flashAnims}
    />
  );
}
