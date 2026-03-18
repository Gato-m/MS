import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { useAppTheme } from "../theme/theme-context";
import { useThemeColors } from "../theme/useThemeColors";

type ThemeTextVariant = "title" | "subtitle" | "caption" | "body";

type ThemeTextProps = {
  children: ReactNode;
  variant?: ThemeTextVariant;
  style?: StyleProp<TextStyle>;
};

export function ThemeText({
  children,
  variant = "body",
  style,
}: ThemeTextProps) {
  const theme = useAppTheme();
  const fallbackColors = useThemeColors();
  const textColor = theme?.colors.text ?? fallbackColors.text;

  return (
    <Text style={[styles.base, styles[variant], { color: textColor }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "colors.textSecondary",
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    marginVertical: 6,
    color: "colors.textSecondary",
  },
});
