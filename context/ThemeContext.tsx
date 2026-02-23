import React, { createContext, useState } from "react";
import { useColorScheme } from "react-native";

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}>({
  isDark: false,
  setIsDark: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const [forcedTheme, setForcedTheme] = useState<"light" | "dark" | null>(null);

  const isDark =
    forcedTheme !== null ? forcedTheme === "dark" : colorScheme === "dark";

  const handleSetIsDark = (dark: boolean) => {
    setForcedTheme(dark ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark: handleSetIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
