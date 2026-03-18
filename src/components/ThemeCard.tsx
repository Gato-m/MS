import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { useAppTheme } from "../theme/theme-context";
import { useThemeColors } from "../theme/useThemeColors";

type ThemeCardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ThemeCard({ children, onPress, style }: ThemeCardProps) {
  const theme = useAppTheme();
  const fallbackColors = useThemeColors();
  const colors = theme?.colors ?? fallbackColors;
  const isDark = theme?.isDark ?? false;

  //   const cardBackground = isDark
  //     ? "rgba(20, 24, 38, 0.82)"
  //     : "rgba(255, 255, 255, 0.9)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.lightGray : colors.gray,
          // backgroundColor: cardBackground,
          opacity: pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      <View>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    // borderRadius: 18,
    borderWidth: 0,
    paddingVertical: 5,
    marginBottom: 0,
  },
});
