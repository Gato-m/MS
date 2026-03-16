export type AppTheme = "light" | "dark";

export const Colors = {
  light: {
    wrapper: "#FFFFFF",
    activeTint: "#e8522c",
    inactiveTint: "#7D7D7D",
    imageOverlay: "rgba(255, 255, 255, 0)",
    toggleBackground: "rgba(255, 255, 255, 0.7)",
    toggleIcon: "#0B0B0B",
    text: "#313131",
    textSecondary: "#7D7D7D",
  },
  dark: {
    wrapper: "#090B10",
    activeTint: "#8CC5FF",
    inactiveTint: "#939393",
    imageOverlay: "rgba(0, 0, 0, 0.42)",
    toggleBackground: "rgba(9, 11, 16, 0.72)",
    toggleIcon: "#F3F7FF",
    text: "#F3F7FF",
    textSecondary: "#959595",
  },
} as const;

export function getThemeColors(theme: AppTheme) {
  return Colors[theme];
}
