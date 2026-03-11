import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ ÖNEMLİ: app klasöründen assets'e çıkarken ../ kullanıyoruz
// Logo PNG olarak arka planı kaldırılmış (transparan) versiyonu kullanıyoruz
const icon = require("../assets/images/icon.png");

const { width } = Dimensions.get("window");

export default function WelcomePage() {
  const router = useRouter();

  // Animasyon Değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.7)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      // Önce logo belirir
      Animated.parallel([
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(100),
      // Sonra içerik kayarak gelir
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // En son buton
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Arka Plan Efektleri */}
      <View style={styles.glowSpot} />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* ✅ YENİ: Logo ayrı bir Animated.View içinde — daha dramatik giriş */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacityAnim,
            transform: [{ scale: logoScaleAnim }],
          },
        ]}
      >
        {/*
         * ✅ YUVARLAK LOGO + ŞEFFAF ARKA PLAN YÖNTEMİ:
         * - iconBackground kaldırıldı; logo doğrudan üst üste bindirilen
         *   gradient-halkalar arasında "yüzüyor".
         * - PNG dosyasının arka planı transparan olduğunu varsayıyoruz.
         *   Eğer arka plan varsa, bir görüntü editörü (remove.bg, Photoshop, vb.)
         *   ile şeffaf PNG'ye dönüştür.
         * - borderRadius: 9999 → tam yuvarlak kırpma (iOS'ta overflow:hidden şart).
         */}
        {/* ✅ Image'e direkt borderRadius — en güvenilir yuvarlak kırpma yöntemi */}
        <Image source={icon} style={styles.iconImage} resizeMode="cover" />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Badge */}
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>SINAVA HAZIRLIK</Text>
        </View>

        {/* Başlık */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>KPSS</Text>
          <Text style={styles.titleAccent}>FOCUS</Text>
        </View>

        {/* Açıklama */}
        <Text style={styles.subtitle}>
          Hedefine odaklan, yapay zeka destekli{"\n"}çalışma planınla başarıya
          ulaş.
        </Text>
      </Animated.View>

      {/* CTA Butonu */}
      <Animated.View
        style={{
          opacity: buttonAnim,
          transform: [
            {
              translateY: buttonAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
          width: "100%",
          marginBottom: 36,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.replace("/(tabs)")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Hemen Başla</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <Text style={styles.hint}>Reklamsız • Sınırsız • Odaklanmış</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060912",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  // ── Arka Plan ──────────────────────────────────────────────────────────────
  glowSpot: {
    position: "absolute",
    top: "10%",
    width: width,
    height: width,
    backgroundColor: "#4C6EFF",
    opacity: 0.07,
    borderRadius: width / 2,
  },
  bgCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1A2FFF",
    opacity: 0.04,
    top: -50,
    right: -50,
  },
  bgCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#4C6EFF",
    opacity: 0.04,
    bottom: 100,
    left: -40,
  },

  // ── Logo (Yuvarlak + Şeffaf) ───────────────────────────────────────────────
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginBottom: 36,
  },

  iconImage: {
    width: 180,
    height: 180,
    borderRadius: 9999, // ✅ Image'e direkt borderRadius — en güvenilir yöntem
    overflow: "hidden",
  },
  logoGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 9999,
    backgroundColor: "#4C6EFF",
    opacity: 0.1,
    // iOS shadow
    shadowColor: "#4C6EFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    // Android elevation
    elevation: 0,
  },

  // ── İçerik ────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(76, 110, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(76, 110, 255, 0.22)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4C6EFF",
  },
  badgeText: {
    color: "#4C6EFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // Başlık
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 44,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -1.5,
  },
  titleAccent: {
    fontSize: 44,
    fontWeight: "900",
    color: "#4C6EFF",
    letterSpacing: -1.5,
  },

  // Subtitle
  subtitle: {
    fontSize: 16,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: "85%",
    marginBottom: 32,
  },

  // ── Buton ─────────────────────────────────────────────────────────────────
  button: {
    backgroundColor: "#4C6EFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 22,
    gap: 10,
    shadowColor: "#4C6EFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  hint: {
    color: "#475569",
    fontSize: 13,
    textAlign: "center",
    marginTop: 22,
    fontWeight: "500",
    opacity: 0.8,
  },
});
