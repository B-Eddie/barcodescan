import { CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, useTheme } from "react-native-paper";
import { auth, database } from "../firebaseConfig";

interface ProductInfo {
  product_name: string;
  brands?: string;
  image_url?: string;
  categories_tags?: string[];
}

export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);

  const fetchProductInfo = async (
    barcode: string
  ): Promise<ProductInfo | null> => {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        return data.product;
      }
      return null;
    } catch (error) {
      console.error("Error fetching product info:", error);
      return null;
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (loading) return;

    try {
      setLoading(true);
      setScanning(false);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to scan products");
        return;
      }

      // Check if product already exists
      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${data}`
      );
      const snapshot = await get(productRef);

      if (snapshot.exists()) {
        // Product exists, navigate to product detail
        router.push(`/product-detail?barcode=${data}`);
        return;
      }

      // Fetch product info from Open Food Facts
      const productInfo = await fetchProductInfo(data);

      if (productInfo) {
        // Navigate to product creation with pre-filled data
        router.push({
          pathname: "/product",
          params: {
            barcode: data,
            name: productInfo.product_name,
            brand: productInfo.brands || "",
            imageUrl: productInfo.image_url,
            category: productInfo.categories_tags?.[0] || "other",
          },
        });
      } else {
        // Navigate to manual entry if product not found
        router.push({
          pathname: "/manual-entry",
          params: { barcode: data },
        });
      }
    } catch (error) {
      console.error("Error processing barcode:", error);
      Alert.alert("Error", "Failed to process barcode. Please try again.");
    } finally {
      setLoading(false);
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
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </CameraView>
      ) : (
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => setScanning(true)}
            style={styles.button}
          >
            Scan Again
          </Button>
        </View>
      )}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Processing barcode...</Text>
        </View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  button: {
    width: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
  },
});
