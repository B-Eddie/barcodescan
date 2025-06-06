import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors, Shadows, Spacing } from "../constants/designSystem";

interface ActionItem {
  icon: string;
  label: string;
  route: string;
  color: string;
}

const actionItems: ActionItem[] = [
  {
    icon: "barcode-scan",
    label: "Scan Barcode",
    route: "/scan",
    color: Colors.primary500,
  },
  {
    icon: "plus",
    label: "Add Manually",
    route: "/add-manual",
    color: Colors.secondary500,
  },
  {
    icon: "receipt",
    label: "Scan Receipt",
    route: "/receipt-scan",
    color: Colors.accent500,
  },
];

export default function FloatingActionButton() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const itemAnimations = useRef(
    actionItems.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // Rotate main button
    Animated.timing(rotateAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate action items
    if (newExpanded) {
      // Expand animation
      itemAnimations.forEach((anim, index) => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            delay: index * 50,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 200,
            delay: index * 50,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            delay: index * 50,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      });
    } else {
      // Collapse animation
      itemAnimations.forEach((anim, index) => {
        Animated.parallel([
          Animated.timing(anim.scale, {
            toValue: 0,
            duration: 150,
            delay: (actionItems.length - index - 1) * 30,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 150,
            delay: (actionItems.length - index - 1) * 30,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 20,
            duration: 150,
            delay: (actionItems.length - index - 1) * 30,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  };

  const handleActionPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(false);

    // Collapse animations
    itemAnimations.forEach((anim, index) => {
      Animated.parallel([
        Animated.timing(anim.scale, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });

    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      router.push(route);
    }, 150);
  };

  const handleMainButtonPress = () => {
    // Scale effect on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    toggleExpanded();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      {isExpanded && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={toggleExpanded}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Action Items */}
      {actionItems.map((item, index) => (
        <Animated.View
          key={item.route}
          style={[
            styles.actionItem,
            {
              bottom: 80 + (index + 1) * 70,
              opacity: itemAnimations[index].opacity,
              transform: [
                { scale: itemAnimations[index].scale },
                { translateY: itemAnimations[index].translateY },
              ],
            },
          ]}
        >
          <View style={styles.actionRow}>
            <View style={styles.labelContainer}>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: item.color }]}
              onPress={() => handleActionPress(item.route)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={24}
                color={Colors.white}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      ))}

      {/* Main FAB */}
      <Animated.View
        style={[
          styles.mainButton,
          {
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleMainButtonPress}
          activeOpacity={0.9}
          style={styles.mainButtonTouchable}
        >
          <LinearGradient
            colors={[Colors.primary400, Colors.primary600]}
            style={styles.mainButtonGradient}
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={Colors.white}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },

  backdrop: {
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 1,
  },

  actionItem: {
    position: "absolute",
    right: 0,
    zIndex: 2,
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  labelContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginRight: Spacing.md,
    ...Shadows.md,
  },

  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.gray800,
    whiteSpace: "nowrap",
  },

  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lg,
  },

  mainButton: {
    zIndex: 3,
  },

  mainButtonTouchable: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  mainButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lg,
  },
});
