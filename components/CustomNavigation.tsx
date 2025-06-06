import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Surface } from "react-native-paper";
import { Colors, SafeArea, Shadows, Spacing } from "../constants/designSystem";

const { width } = Dimensions.get("window");

interface NavItem {
  name: string;
  icon: string;
  route: string;
  label: string;
}

const navItems: NavItem[] = [
  { name: "home", icon: "home-variant", route: "/", label: "Home" },
  { name: "recipes", icon: "chef-hat", route: "/recipes", label: "Recipes" },
  {
    name: "calendar",
    icon: "calendar-month",
    route: "/calendar",
    label: "Calendar",
  },
  { name: "settings", icon: "cog", route: "/settings", label: "Settings" },
];

export default function CustomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const animatedValues = useRef(
    navItems.reduce((acc, item) => {
      acc[item.name] = new Animated.Value(pathname === item.route ? 1 : 0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  const scanButtonScale = useRef(new Animated.Value(1)).current;
  const scanButtonRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate navigation items
    navItems.forEach((item) => {
      const isActive = pathname === item.route;
      Animated.spring(animatedValues[item.name], {
        toValue: isActive ? 1 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });
  }, [pathname]);

  const handleNavPress = (route: string) => {
    router.push(route as any);
  };

  const handleScanPress = () => {
    // Animate scan button
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scanButtonScale, {
          toValue: 0.9,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.timing(scanButtonRotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(scanButtonScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.timing(scanButtonRotation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    router.push("/receipt-scan");
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.route;
    const animatedValue = animatedValues[item.name];

    const iconScale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.2],
    });

    const iconTranslateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -2],
    });

    const textOpacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
    });

    const backgroundOpacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.1],
    });

    return (
      <TouchableOpacity
        key={item.name}
        style={styles.navItem}
        onPress={() => handleNavPress(item.route)}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            {
              opacity: backgroundOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.navIconContainer,
            {
              transform: [{ scale: iconScale }, { translateY: iconTranslateY }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={isActive ? Colors.primary500 : Colors.gray500}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.navLabel,
            {
              opacity: textOpacity,
              color: isActive ? Colors.primary500 : Colors.gray500,
            },
          ]}
        >
          {item.label}
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const scanButtonRotate = scanButtonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Main Navigation Bar */}
      <Surface style={styles.navBar} elevation={8}>
        <View style={styles.navContent}>
          {navItems.slice(0, 2).map(renderNavItem)}

          {/* Scan Button Placeholder */}
          <View style={styles.scanPlaceholder} />

          {navItems.slice(2).map(renderNavItem)}
        </View>
      </Surface>

      {/* Floating Scan Button */}
      <Animated.View
        style={[
          styles.scanButtonContainer,
          {
            transform: [
              { scale: scanButtonScale },
              { rotate: scanButtonRotate },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPress}
          activeOpacity={0.9}
        >
          <View style={styles.scanButtonInner}>
            <MaterialCommunityIcons
              name="receipt"
              size={28}
              color={Colors.white}
            />
          </View>
          <View style={styles.scanButtonGlow} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },

  navBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingBottom: SafeArea.bottom,
    ...Shadows.lg,
  },

  navContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    position: "relative",
  },

  navItemBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary500,
    borderRadius: 12,
  },

  navIconContainer: {
    marginBottom: Spacing.xs,
  },

  navLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },

  scanPlaceholder: {
    width: 60,
    height: 60,
  },

  scanButtonContainer: {
    position: "absolute",
    bottom: SafeArea.bottom + 50,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    zIndex: 10,
  },

  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary500,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.lg,
  },

  scanButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary500,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  scanButtonGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary500,
    opacity: 0.2,
    top: -10,
    left: -10,
    zIndex: 1,
  },
});

export { CustomNavigation };
