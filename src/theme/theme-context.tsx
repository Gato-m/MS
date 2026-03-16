import { createContext, ReactNode, useContext } from "react";

import { AppTheme, getThemeColors } from "./colors";

type ThemeColors = ReturnType<typeof getThemeColors>;

type ThemeContextValue = {
  themeName: AppTheme;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  value: ThemeContextValue;
  children: ReactNode;
};

export function ThemeProvider({ value, children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
