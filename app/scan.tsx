import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { Alert, Animated, Dimensions, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scanLineAnim] = useState(new Animated.Value(0));
  const { width } = Dimensions.get("window");

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanning]);

  const fetchProductInfo = async (
    barcode: string
  ): Promise<ProductInfo | null> => {
    try {
      console.log(`[Scan] Fetching product info for barcode: ${barcode}`);
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        console.log("[Scan] Product found:", {
          name: data.product.product_name,
          brand: data.product.brands,
          category: data.product.categories_tags?.[0],
          image: data.product.image_url,
        });
        return data.product;
      }
      console.log("[Scan] Product not found in Open Food Facts");
      return null;
    } catch (error) {
      console.error("[Scan] Error fetching product info:", error);
      return null;
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (loading) return;

    try {
      console.log(`[Scan] Barcode scanned: ${data}`);
      setLoading(true);
      setScanning(false);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        console.log("[Scan] User not logged in");
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
        console.log("[Scan] Product exists in database:", snapshot.val());
        router.push(`/product-detail?barcode=${data}`);
        return;
      }

      // Fetch product info from Open Food Facts
      const productInfo = await fetchProductInfo(data);

      if (productInfo) {
        console.log("[Scan] Navigating to product creation with data:", {
          barcode: data,
          name: productInfo.product_name,
          brand: productInfo.brands || "",
          imageUrl: productInfo.image_url,
          category: productInfo.categories_tags?.[0] || "other",
        });
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
        console.log("[Scan] Product not found, navigating to manual entry");
        router.push({
          pathname: "/manual-entry",
          params: { barcode: data },
        });
      }
    } catch (error) {
      console.error("[Scan] Error processing barcode:", error);
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
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.7)"]}
            style={styles.overlay}
          >
            <View style={styles.scanArea}>
              <View style={styles.scanCorner} />
              <View style={[styles.scanCorner, styles.topRight]} />
              <View style={[styles.scanCorner, styles.bottomLeft]} />
              <View style={[styles.scanCorner, styles.bottomRight]} />
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 250],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <Surface style={styles.instructionContainer} elevation={4}>
              <IconButton
                icon="barcode-scan"
                size={24}
                iconColor={theme.colors.primary}
                style={styles.instructionIcon}
              />
              <Text style={styles.scanText}>Position barcode within frame</Text>
            </Surface>
          </LinearGradient>
        </CameraView>
      ) : (
        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
          <LinearGradient
            colors={["#f6f7f9", "#ffffff"]}
            style={styles.buttonContainer}
          >
            <Surface style={styles.resultCard} elevation={4}>
              <IconButton
                icon="check-circle"
                size={48}
                iconColor={theme.colors.primary}
                style={styles.resultIcon}
              />
              <Text style={styles.scanAgainText}>
                Ready to scan another product?
              </Text>
              <Button
                mode="contained"
                onPress={() => setScanning(true)}
                style={styles.button}
                icon="barcode-scan"
                contentStyle={styles.buttonContent}
              >
                Scan Again
              </Button>
            </Surface>
          </LinearGradient>
        </Animated.View>
      )}
      {loading && (
        <Surface style={styles.loadingContainer} elevation={4}>
          <LinearGradient
            colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.8)"]}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processing barcode...</Text>
          </LinearGradient>
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
    borderColor: "transparent",
    backgroundColor: "transparent",
    position: "relative",
  },
  scanCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#fff",
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: -2,
    left: -2,
  },
  topRight: {
    right: -2,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    top: undefined,
    bottom: -2,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    top: undefined,
    left: undefined,
    right: -2,
    bottom: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  scanLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "#6200ee",
    opacity: 0.8,
  },
  instructionContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 32,
  },
  instructionIcon: {
    margin: 0,
    marginRight: 8,
  },
  scanText: {
    color: "#1a1a1a",
    fontSize: 16,
    fontWeight: "500",
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultCard: {
    width: "100%",
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  resultIcon: {
    marginBottom: 16,
  },
  scanAgainText: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: "center",
    color: "#1a1a1a",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
});
