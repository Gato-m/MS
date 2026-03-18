import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type TabScreenContainerProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function TabScreenContainer({
  children,
  style,
}: TabScreenContainerProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 24,
    paddingTop: 60,
  },
});
