import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter, useSegments, SplashScreen } from "expo-router";
import { useTheme } from "react-native-paper";
import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Auth check component - handles redirects based on auth state
function AuthCheck({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";
    
    if (!user && !inAuthGroup) {
      // If user is not signed in and the initial segment is not part of the auth group,
      // redirect to the sign-in page
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // If user is signed in and the initial segment is part of the auth group,
      // redirect to the home page
      router.replace("/");
    }
    
    SplashScreen.hideAsync();
  }, [user, loading, segments]);
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  return <>{children}</>;
}

// Root layout
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

// Navigation structure
function RootLayoutNav() {
  const theme = useTheme();
  const { user } = useAuth();

  return (
    <AuthCheck>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.outline,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
          },
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.onBackground,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="fridge-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="barcode-scan"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="receipt-scan"
          options={{
            title: "Receipt",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="receipt"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="calendar-clock"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="cog-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen 
          name="auth"
          options={{
            href: null, // Hide this tab from the tab bar
          }}
        />
      </Tabs>
    </AuthCheck>
  );
}
