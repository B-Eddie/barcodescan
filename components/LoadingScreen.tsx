import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors, Spacing } from "../constants/designSystem";

const { width, height } = Dimensions.get("window");

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "Loading...",
}: LoadingScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Scale up icon
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // Continuous rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <LinearGradient
      colors={[Colors.primary50, Colors.primary100, Colors.primary200]}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }, { rotate: rotation }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="food-apple"
            size={80}
            color={Colors.primary500}
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.title}>FreshTracker</Text>
          <Text style={styles.subtitle}>Smart Food Expiry Management</Text>
        </Animated.View>

        {/* Loading Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingDots}>
            <Animated.View
              style={[
                styles.dot,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: [1.1, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </View>
          <Text style={styles.message}>{message}</Text>
        </Animated.View>
      </Animated.View>

      {/* Floating particles background */}
      <View style={styles.particlesContainer}>
        {[...Array(8)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, -100],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialCommunityIcons
              name={
                ["food-apple", "carrot", "fish", "bread-slice", "cheese"][
                  index % 5
                ] as any
              }
              size={20 + Math.random() * 10}
              color={Colors.primary300}
              style={{ opacity: 0.3 }}
            />
          </Animated.View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    alignItems: "center",
    zIndex: 10,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary500,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary800,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: Colors.primary600,
    textAlign: "center",
    fontWeight: "500",
  },

  messageContainer: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },

  loadingDots: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary500,
    marginHorizontal: 4,
  },

  message: {
    fontSize: 16,
    color: Colors.primary700,
    fontWeight: "500",
  },

  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  particle: {
    position: "absolute",
  },
});
