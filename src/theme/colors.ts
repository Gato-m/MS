export type AppTheme = "light" | "dark";

export const Colors = {
  light: {
    wrapper: "#FFFFFF",
    activeTint: "#db2626",
    activeTabIcon: "#b61007",
    inactiveTint: "#7a1e1e",
    imageOverlay: "rgba(255, 255, 255, 0)",
    toggleBackground: "rgba(255, 255, 255, 0.7)",
    toggleIcon: "#0B0B0B",
    text: "#313131",
    textSecondary: "#424242",
    white: "#FFFFFF",
    gray: "#565656",
    lightGray: "#cbcbcb",
  },
  dark: {
    wrapper: "#3b3b3b",
    activeTint: "#df2424",
    activeTabIcon: "#c71b04",
    inactiveTint: "#818181",
    imageOverlay: "rgba(83, 42, 42, 0.1)",
    toggleBackground: "rgba(9, 11, 16, 0.72)",
    toggleIcon: "#F3F7FF",
    text: "#F3F7FF",
    textSecondary: "#353535",
    white: "#FFFFFF",
    gray: "#e2e2e2",
    lightGray: "#d5d5d5",
  },
} as const;

export function getThemeColors(theme: AppTheme) {
  return Colors[theme];
}
