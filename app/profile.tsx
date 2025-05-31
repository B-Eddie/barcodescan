import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Text, Surface, Button } from "react-native-paper";
import { auth } from "../firebaseConfig";

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>Profile</Text>
        <Text variant="bodyLarge" style={styles.email}>{user?.email}</Text>
        <Button 
          mode="contained" 
          onPress={handleSignOut}
          style={styles.button}
        >
          Sign Out
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  card: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 16,
    fontWeight: "600",
  },
  email: {
    marginBottom: 24,
    color: "#666",
  },
  button: {
    marginTop: 8,
  },
}); 