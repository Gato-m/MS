import { useMemo } from "react";
import { useColorScheme } from "react-native";

import { AppTheme, getThemeColors } from "./colors";

export function useThemeColors(themeOverride?: AppTheme) {
  const systemTheme = useColorScheme() === "dark" ? "dark" : "light";
  const themeName = themeOverride ?? systemTheme;

  return useMemo(() => getThemeColors(themeName), [themeName]);
}
