// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useContext, useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import { playSound, preloadSounds } from "../../utils/soundManager";

export default function TabLayout() {
  const theme = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    preloadSounds();
  }, []);

  if (!theme) return null;

  const { isDark } = theme;

  const colors = {
    bg: isDark ? "#0D0D0D" : "#f8f9fa",
    text: isDark ? "#ffffff" : "#1a1a1a",
    accent: isDark ? "#00E5FF" : "#2563eb",
    border: isDark ? "#1a1a1a" : "#e5e7eb",
    inactive: isDark ? "#666" : "#999",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenListeners={{
          tabPress: () => {
            playSound("click");
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.inactive,
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            marginTop: 4,
            color: colors.text,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Ana Sayfa",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="subjects"
          options={{
            title: "Konular",
            tabBarIcon: ({ color }) => (
              <Ionicons name="book" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="True-False"
          options={{
            title: "True-False",
            tabBarIcon: ({ color }) => (
              <Ionicons name="checkmark-circle-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Doğru-Yanlış",
            tabBarIcon: ({ color }) => (
              <Ionicons name="help-outline" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fun"
          options={{
            title: "Oyun",
            tabBarIcon: ({ color }) => (
              <Ionicons name="game-controller-outline" size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
