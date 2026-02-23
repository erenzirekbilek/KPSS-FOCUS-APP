// app/(tabs)/profile.tsx

import React, { ReactElement, useContext } from "react";
import { Text, View } from "react-native";
import { ThemeContext } from "../../context/ThemeContext";

export default function Profile(): ReactElement {
  const theme = useContext(ThemeContext);

  if (!theme) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D" }}>
        <Text style={{ color: "#ffffff" }}>Loading...</Text>
      </View>
    );
  }

  const { isDark } = theme;

  const colors = {
    bg: isDark ? "#0D0D0D" : "#ffffff",
    text: isDark ? "#ffffff" : "#1a1a1a",
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bg,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold" }}>
        Profil Sayfası
      </Text>
    </View>
  );
}
