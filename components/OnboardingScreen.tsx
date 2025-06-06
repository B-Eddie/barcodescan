import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Shadows, Spacing } from "../constants/designSystem";

const { width, height } = Dimensions.get("window");

interface OnboardingStep {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  gradient: string[];
}

const onboardingSteps: OnboardingStep[] = [
  {
    icon: "barcode-scan",
    title: "Smart Scanning",
    subtitle:
      "Scan barcodes or receipts to instantly add items with AI-powered expiry predictions",
    color: Colors.primary500,
    gradient: [Colors.primary500, Colors.primary600],
  },
  {
    icon: "calendar-clock",
    title: "Never Waste Food",
    subtitle:
      "Get timely notifications and visual reminders before your food expires",
    color: Colors.secondary500,
    gradient: [Colors.secondary500, Colors.secondary600],
  },
  {
    icon: "chart-line",
    title: "Smart Analytics",
    subtitle:
      "Track consumption patterns and reduce food waste with intelligent insights",
    color: Colors.accent500,
    gradient: [Colors.accent500, Colors.accent600],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animateStep();
  }, [currentStep]);

  const animateStep = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    iconScale.setValue(0);

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / onboardingSteps.length,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGetStarted();
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleGetStarted();
  };

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/auth/login");
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={currentStepData.gradient}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Skip Button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          {onboardingSteps.map((_, index) => (
            <View key={index} style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          "0%",
                          index <= currentStep ? "100%" : "0%",
                        ],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons
                name={currentStepData.icon as any}
                size={80}
                color={currentStepData.color}
              />
            </View>
          </Animated.View>

          {/* Text Content */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{currentStepData.title}</Text>
            <Text style={styles.subtitle}>{currentStepData.subtitle}</Text>
          </Animated.View>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentStep === 0 && styles.navButtonDisabled,
            ]}
            onPress={handlePrevious}
            disabled={currentStep === 0}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={24}
              color={currentStep === 0 ? Colors.white : Colors.white}
              style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
            />
          </TouchableOpacity>

          <View style={styles.stepIndicators}>
            {onboardingSteps.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stepDot,
                  index === currentStep && styles.stepDotActive,
                ]}
                onPress={() => setCurrentStep(index)}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            {currentStep === onboardingSteps.length - 1 ? (
              <MaterialCommunityIcons
                name="check"
                size={24}
                color={Colors.white}
              />
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={Colors.white}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Get Started Button */}
        {currentStep === onboardingSteps.length - 1 && (
          <Animated.View
            style={[
              styles.getStartedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={styles.getStartedButton}
              contentStyle={styles.getStartedButtonContent}
              labelStyle={styles.getStartedButtonText}
              buttonColor={Colors.white}
              textColor={currentStepData.color}
            >
              Get Started
            </Button>
          </Animated.View>
        )}

        {/* Floating particles */}
        <View style={styles.particlesContainer}>
          {[...Array(12)].map((_, index) => (
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
                        outputRange: [0, -100 - Math.random() * 200],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons
                name={
                  [
                    "food-apple",
                    "carrot",
                    "fish",
                    "bread-slice",
                    "cheese",
                    "bottle-wine",
                  ][index % 6] as any
                }
                size={16 + Math.random() * 8}
                color={Colors.white}
                style={{ opacity: 0.2 }}
              />
            </Animated.View>
          ))}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  backgroundGradient: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },

  skipButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  skipText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: "500",
    opacity: 0.9,
  },

  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },

  progressBarContainer: {
    flex: 1,
  },

  progressBarBackground: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: Colors.white,
    borderRadius: 2,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },

  iconContainer: {
    marginBottom: Spacing["3xl"],
  },

  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.lg,
  },

  textContainer: {
    alignItems: "center",
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },

  subtitle: {
    fontSize: 18,
    color: Colors.white,
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 28,
    paddingHorizontal: Spacing.md,
  },

  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  navButtonDisabled: {
    opacity: 0.5,
  },

  stepIndicators: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  stepDotActive: {
    backgroundColor: Colors.white,
  },

  getStartedContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },

  getStartedButton: {
    borderRadius: 12,
    ...Shadows.lg,
  },

  getStartedButtonContent: {
    height: 56,
  },

  getStartedButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },

  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },

  particle: {
    position: "absolute",
  },
});
