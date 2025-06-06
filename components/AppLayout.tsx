import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../constants/designSystem";
import { CustomNavigation } from "./CustomNavigation";

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export default function AppLayout({
  children,
  showNavigation = true,
}: AppLayoutProps) {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.content}>{children}</View>
        {showNavigation && <CustomNavigation />}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    flex: 1,
    paddingBottom: 100, // Account for custom nav height
  },
});
