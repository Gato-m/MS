import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppTheme } from "../../theme/colors";
import { ThemeProvider } from "../../theme/theme-context";
import { useThemeColors } from "../../theme/useThemeColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const bgSource = require("../../../assets/images/Bg.png");

export default function TabsLayout() {
  const [themeName, setThemeName] = useState<AppTheme>("light");
  const isDark = themeName === "dark";
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const progress = useSharedValue(0);
  const theme = useThemeColors(themeName);
  const bgAsset = Image.resolveAssetSource(bgSource);
  const bgAspectRatio =
    bgAsset && bgAsset.width && bgAsset.height
      ? bgAsset.width / bgAsset.height
      : 1;
  const bgWidth = screenHeight * bgAspectRatio;

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 1 + progress.value * 0.12 }],
    };
  });

  const toggleTheme = () => {
    const next = !isDark;
    setThemeName(next ? "dark" : "light");
    progress.value = withTiming(next ? 1 : 0, { duration: 220 });
  };

  const themeValue = {
    themeName,
    isDark,
    colors: theme,
    toggleTheme,
  };

  return (
    <ThemeProvider value={themeValue}>
      <View style={[styles.wrapper, { backgroundColor: theme.wrapper }]}>
        <Image
          source={bgSource}
          style={[
            styles.backgroundImage,
            { width: bgWidth, height: screenHeight },
          ]}
        />
        <AnimatedPressable
          onPress={toggleTheme}
          style={[
            styles.toggle,
            {
              top: insets.top + 10,
              backgroundColor: theme.toggleBackground,
            },
          ]}
        >
          <Animated.View style={iconAnimatedStyle}>
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={20}
              color={theme.toggleIcon}
            />
          </Animated.View>
        </AnimatedPressable>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.activeTabIcon,
            tabBarInactiveTintColor: isDark ? theme.lightGray : theme.lightGray,
            tabBarStyle: styles.tabBar,
            tabBarItemStyle: styles.tabBarItem,
            tabBarIconStyle: styles.tabBarIcon,
            sceneStyle: styles.scene,
          }}
        >
          <Tabs.Screen
            name="events"
            options={{
              title: "Events",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="calendar-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="map"
            options={{
              title: "Map",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="map-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="info"
            options={{
              title: "Info",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="information-circle-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />
        </Tabs>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    overflow: "hidden",
  },
  backgroundImage: {
    position: "absolute",
    left: 0,
    bottom: 10,
    resizeMode: "cover",
  },
  toggle: {
    position: "absolute",
    right: 16,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  scene: {
    backgroundColor: "transparent",
  },
  tabBar: {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    height: 85,
  },
  tabBarItem: {
    paddingTop: 6,
    paddingBottom: 0,
  },
  tabBarIcon: {
    marginTop: -3,
  },
});
