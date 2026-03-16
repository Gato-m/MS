export type AppTheme = "light" | "dark";

export const Colors = {
  light: {
    wrapper: "#FFFFFF",
    activeTint: "#c51117",
    inactiveTint: "#aaaaaa",
    imageOverlay: "rgba(255, 255, 255, 0)",
    toggleBackground: "rgba(255, 255, 255, 0.7)",
    toggleIcon: "#0B0B0B",
    text: "#313131",
    textSecondary: "#7D7D7D",
  },
  dark: {
    wrapper: "#262626",
    activeTint: "#f6f6f6",
    inactiveTint: "#939393",
    imageOverlay: "rgba(83, 42, 42, 0.1)",
    toggleBackground: "rgba(9, 11, 16, 0.72)",
    toggleIcon: "#F3F7FF",
    text: "#F3F7FF",
    textSecondary: "#959595",
  },
} as const;

export function getThemeColors(theme: AppTheme) {
  return Colors[theme];
}
