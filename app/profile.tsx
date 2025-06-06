import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

export default function ProfileScreen() {
  const router = useRouter();

  // Auto-redirect to settings after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/settings");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleGoToSettings = () => {
    router.push("/settings");
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="account-arrow-right"
            size={64}
            color="#666"
          />
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          Profile Moved
        </Text>
        <Text variant="bodyLarge" style={styles.description}>
          Your profile and account settings have been moved to the Settings page
          for a better experience.
        </Text>
        <Button
          mode="contained"
          onPress={handleGoToSettings}
          style={styles.button}
          icon="cog"
        >
          Go to Settings
        </Button>
        <Text variant="bodySmall" style={styles.autoRedirect}>
          Redirecting automatically in 2 seconds...
        </Text>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
  },
  card: {
    padding: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  description: {
    marginBottom: 24,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  autoRedirect: {
    color: "#999",
    textAlign: "center",
  },
});
