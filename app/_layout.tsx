import { Stack } from "expo-router";
import { ThemeProvider } from "../context/ThemeContext";
import "../globals.css";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="tests" />
      </Stack>
    </ThemeProvider>
  );
}
