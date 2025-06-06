import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { get, ref, set } from "firebase/database";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLayout from "../components/AppLayout";
import { Colors, SafeArea, Spacing } from "../constants/designSystem";
import { auth, database } from "../firebaseConfig";
import { AdvancedExpiryCalculator } from "../services/advancedExpiryCalculator";

const { width, height } = Dimensions.get("window");

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [productInfo, setProductInfo] = useState<any>(null);
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (permission?.granted) {
        // Start animations
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
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
          ),
        ]).start();
      }

      return () => {
        setScanned(false);
        setProductInfo(null);
        fadeAnim.setValue(0);
        successAnim.setValue(0);
      };
    }, [permission])
  );

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Stop scan line animation and start pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to scan products");
        resetScan();
        return;
      }

      // First check if product already exists
      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${data}`
      );
      const existingProduct = await get(productRef);

      if (existingProduct.exists()) {
        Alert.alert(
          "Product Already Added",
          "This product is already in your pantry. Would you like to view it?",
          [
            {
              text: "Cancel",
              onPress: resetScan,
              style: "cancel",
            },
            {
              text: "View Product",
              onPress: () => {
                router.push(`/product-detail?barcode=${data}`);
              },
            },
          ]
        );
        return;
      }

      // Try to get product info from barcode API
      let productName = "Unknown Product";
      let category = "other";

      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${data}.json`
        );
        const productData = await response.json();

        if (productData.status === 1 && productData.product) {
          const product = productData.product;
          productName = product.product_name || "Unknown Product";

          // Determine category from OpenFoodFacts categories
          if (product.categories) {
            const categories = product.categories.toLowerCase();
            if (
              categories.includes("dairy") ||
              categories.includes("milk") ||
              categories.includes("cheese") ||
              categories.includes("yogurt")
            ) {
              category = "dairy";
            } else if (
              categories.includes("meat") ||
              categories.includes("poultry") ||
              categories.includes("fish")
            ) {
              category = "meat";
            } else if (
              categories.includes("fruit") ||
              categories.includes("vegetable")
            ) {
              category = "produce";
            } else if (
              categories.includes("bread") ||
              categories.includes("bakery")
            ) {
              category = "bakery";
            } else if (
              categories.includes("snack") ||
              categories.includes("chocolate") ||
              categories.includes("candy")
            ) {
              category = "snacks";
            } else if (
              categories.includes("beverage") ||
              categories.includes("drink")
            ) {
              category = "beverages";
            } else if (
              categories.includes("canned") ||
              categories.includes("preserved")
            ) {
              category = "canned";
            } else if (categories.includes("frozen")) {
              category = "frozen";
            }
          }
        }
      } catch (apiError) {
        console.log("API fetch failed, using default values");
      }

      // Calculate expiry date using advanced algorithm
      const expiryResult = await AdvancedExpiryCalculator.calculateExpiry(
        productName
      );
      const purchaseDate = new Date().toISOString().split("T")[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryResult.shelfLifeDays);

      const productInfo = {
        name: productName,
        purchaseDate,
        expiryDate: expiryDate.toISOString().split("T")[0],
        confidence: expiryResult.confidence,
        category,
        quantity: 1,
        method: expiryResult.method,
        barcode: data,
        addedAt: new Date().toISOString(),
      };

      // Save to Firebase
      await set(productRef, productInfo);

      setProductInfo(productInfo);

      // Success animation
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.push(`/product-detail?barcode=${data}`);
      }, 1500);
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save product. Please try again.", [
        { text: "OK", onPress: resetScan },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const resetScan = () => {
    setScanned(false);
    setProcessing(false);
    setProductInfo(null);
    successAnim.setValue(0);

    // Restart scan line animation
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
  };

  if (!permission) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.primary500} />
            <Text style={styles.loadingText}>
              Loading camera permissions...
            </Text>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  if (!permission.granted) {
    return (
      <AppLayout>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <MaterialCommunityIcons
              name="camera-off"
              size={64}
              color={Colors.gray400}
            />
            <Text style={styles.permissionTitle}>
              Camera Permission Required
            </Text>
            <Text style={styles.permissionText}>
              Please grant camera permission to scan barcodes
            </Text>
            <Button
              mode="contained"
              onPress={requestPermission}
              style={styles.permissionButton}
            >
              Grant Permission
            </Button>
          </View>
        </SafeAreaView>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.cameraContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: [
                "qr",
                "ean13",
                "ean8",
                "upc_a",
                "upc_e",
                "code128",
                "code39",
              ],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color={Colors.white}
                  />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan Barcode</Text>
                <View style={styles.placeholder} />
              </View>

              {/* Scanning Frame */}
              <View style={styles.scanArea}>
                <Animated.View
                  style={[
                    styles.scanFrame,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <View style={styles.cornerTopLeft} />
                  <View style={styles.cornerTopRight} />
                  <View style={styles.cornerBottomLeft} />
                  <View style={styles.cornerBottomRight} />

                  {/* Animated scan line */}
                  {!scanned && (
                    <Animated.View
                      style={[
                        styles.scanLine,
                        {
                          transform: [
                            {
                              translateY: scanLineAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 200],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  )}

                  {/* Success indicator */}
                  {productInfo && (
                    <Animated.View
                      style={[
                        styles.successIndicator,
                        {
                          opacity: successAnim,
                          transform: [{ scale: successAnim }],
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={60}
                        color={Colors.success}
                      />
                    </Animated.View>
                  )}
                </Animated.View>
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                {processing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color={Colors.white} />
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                ) : productInfo ? (
                  <View style={styles.successContainer}>
                    <Text style={styles.successTitle}>Product Added!</Text>
                    <Text style={styles.successSubtitle}>
                      {productInfo.name}
                    </Text>
                    <Text style={styles.successDetails}>
                      Expires:{" "}
                      {new Date(productInfo.expiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.instructionContainer}>
                    <Text style={styles.instructionTitle}>
                      Position barcode within the frame
                    </Text>
                    <Text style={styles.instructionSubtitle}>
                      The barcode will be scanned automatically
                    </Text>
                  </View>
                )}
              </View>

              {/* Reset Button */}
              {scanned && !processing && (
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetScan}
                  >
                    <MaterialCommunityIcons
                      name="camera-retake"
                      size={24}
                      color={Colors.white}
                    />
                    <Text style={styles.resetButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </CameraView>
        </Animated.View>
      </SafeAreaView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },

  loadingText: {
    fontSize: 16,
    color: Colors.gray600,
    marginTop: Spacing.md,
    textAlign: "center",
  },

  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.gray900,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },

  permissionText: {
    fontSize: 16,
    color: Colors.gray600,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },

  permissionButton: {
    borderRadius: 12,
  },

  cameraContainer: {
    flex: 1,
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SafeArea.top,
    paddingHorizontal: SafeArea.horizontal,
    paddingBottom: Spacing.lg,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.white,
  },

  placeholder: {
    width: 40,
  },

  scanArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scanFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },

  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary500,
    borderTopLeftRadius: 8,
  },

  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary500,
    borderTopRightRadius: 8,
  },

  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.primary500,
    borderBottomLeftRadius: 8,
  },

  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.primary500,
    borderBottomRightRadius: 8,
  },

  scanLine: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: Colors.primary500,
    shadowColor: Colors.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  successIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -30,
    marginLeft: -30,
  },

  instructions: {
    paddingHorizontal: SafeArea.horizontal,
    paddingVertical: Spacing.xl,
    minHeight: 100,
  },

  processingContainer: {
    alignItems: "center",
  },

  processingText: {
    fontSize: 18,
    color: Colors.white,
    marginTop: Spacing.md,
    fontWeight: "500",
  },

  successContainer: {
    alignItems: "center",
  },

  successTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.white,
    marginBottom: Spacing.sm,
  },

  successSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },

  successDetails: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.7,
  },

  instructionContainer: {
    alignItems: "center",
  },

  instructionTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },

  instructionSubtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.7,
    textAlign: "center",
  },

  actionContainer: {
    paddingHorizontal: SafeArea.horizontal,
    paddingBottom: SafeArea.bottom + Spacing.lg,
    alignItems: "center",
  },

  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },

  resetButtonText: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: "500",
    marginLeft: Spacing.sm,
  },
});
