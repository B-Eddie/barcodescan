import { useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Text, Surface, Button } from "react-native-paper";
import { CameraView } from "expo-camera";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";

export default function ScanIngredientsScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      setScanning(false);
      // Here you would typically process the ingredient barcode
      // For now, we'll just navigate back
      router.back();
    } catch (error) {
      console.error("Error scanning ingredient:", error);
    }
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
          }}
          onBarcodeScanned={handleBarCodeScanned}
          facing="back"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.7)"]}
            style={styles.overlay}
          >
            <View style={styles.scanArea}>
              <Text style={styles.instruction}>
                Scan ingredient barcode
              </Text>
            </View>
          </LinearGradient>
        </CameraView>
      ) : (
        <Surface style={styles.card} elevation={2}>
          <Text variant="headlineMedium" style={styles.title}>Scan Ingredients</Text>
          <Text variant="bodyLarge" style={styles.description}>
            Scan the barcode of each ingredient in your recipe
          </Text>
          <Button 
            mode="contained" 
            onPress={() => setScanning(true)}
            style={styles.button}
          >
            Start Scanning
          </Button>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  instruction: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
    margin: 16,
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