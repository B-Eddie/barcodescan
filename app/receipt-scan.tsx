import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Text, Surface, Button } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator } from "react-native-paper";

export default function ReceiptScanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleScanReceipt = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        // Here you would typically process the receipt image
        // For now, we'll just navigate back
        router.back();
      }
    } catch (error) {
      console.error("Error scanning receipt:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>Scan Receipt</Text>
        <Text variant="bodyLarge" style={styles.description}>
          Take a photo of your receipt to automatically add items to your inventory
        </Text>
        <Button 
          mode="contained" 
          onPress={handleScanReceipt}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          Select Receipt Photo
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
  description: {
    marginBottom: 24,
    color: "#666",
    lineHeight: 24,
  },
  button: {
    marginTop: 8,
  },
}); 