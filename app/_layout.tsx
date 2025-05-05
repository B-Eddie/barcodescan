import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SplashScreen, Tabs, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

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
    <GestureHandlerRootView style={styles.container}>
      <PaperProvider>
        <AuthProvider>
          <AuthCheck>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarStyle: {
                  height: 60,
                  paddingBottom: 8,
                  paddingTop: 8,
                },
                tabBarActiveTintColor: "#007AFF",
                tabBarInactiveTintColor: "#8E8E93",
              }}
            >
              <Tabs.Screen
                name="index"
                options={{
                  title: "Home",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="home"
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
                name="calendar"
                options={{
                  title: "Calendar",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="calendar"
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
                      name="cog"
                      size={size}
                      color={color}
                    />
                  ),
                }}
              />
              {/* Hide these screens from the tab bar but keep them accessible */}
              <Tabs.Screen
                name="auth"
                options={{
                  href: null,
                }}
              />
              <Tabs.Screen
                name="product"
                options={{
                  href: null,
                }}
              />
              <Tabs.Screen
                name="product-detail"
                options={{
                  href: null,
                }}
              />
              <Tabs.Screen
                name="manual-entry"
                options={{
                  href: null,
                }}
              />
              <Tabs.Screen
                name="receipt-scan"
                options={{
                  href: null,
                }}
              />
            </Tabs>
          </AuthCheck>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
