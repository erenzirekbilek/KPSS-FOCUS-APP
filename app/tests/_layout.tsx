// app/tests/_layout.tsx

import { Stack } from "expo-router";
import React from "react";

export default function TestsLayout() {
  return (
    <Stack
      screenOptions={{
        // Bu klasördeki tüm sayfalar için ortak ayarlar
        headerShown: false,
        animation: "slide_from_right", // Sayfalar arası geçiş sağdan kayarak olsun
        contentStyle: { backgroundColor: "transparent" }, // Arka plan titremesini engeller
      }}
    >
      {/* Test Listesi Ekranı */}
      <Stack.Screen
        name="testlist"
        options={{
          title: "Testler",
        }}
      />

      {/* Soru Çözüm Ekranı */}
      <Stack.Screen
        name="questions"
        options={{
          title: "Sınav",
          gestureEnabled: false, // Sınavdayken kaydırarak geri çıkmayı kapatır (yanlışlıkla çıkmasınlar)
        }}
      />
    </Stack>
  );
}
