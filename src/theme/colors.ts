export type AppTheme = "light" | "dark";

export const Colors = {
  light: {
    wrapper: "#FFFFFF",
    activeTint: "#c51117",
    inactiveTint: "#808080",
    imageOverlay: "rgba(255, 255, 255, 0)",
    toggleBackground: "rgba(255, 255, 255, 0.7)",
    toggleIcon: "#0B0B0B",
    text: "#313131",
    textSecondary: "#353434",
    white: "#FFFFFF",
    gray: "#808080",
  },
  dark: {
    wrapper: "#262626",
    activeTint: "#f81010",
    inactiveTint: "#3f3f3f",
    imageOverlay: "rgba(83, 42, 42, 0.1)",
    toggleBackground: "rgba(9, 11, 16, 0.72)",
    toggleIcon: "#F3F7FF",
    text: "#F3F7FF",
    textSecondary: "#353535",
    white: "#FFFFFF",
    gray: "#808080",
  },
} as const;

export function getThemeColors(theme: AppTheme) {
  return Colors[theme];
}
