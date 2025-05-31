import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Animated, Dimensions, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
  FAB,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";
import { getExpiryDate } from "../utils/expiryDate";
import { ref, set } from "firebase/database";
import { Camera } from "react-native-vision-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";

interface ProductInfo {
  product_name: string;
  brands?: string;
  image_url?: string;
  categories_tags?: string[];
  nutriments?: {
    energy_100g?: number;
    carbohydrates_100g?: number;
    proteins_100g?: number;
    fat_100g?: number;
    serving_size?: string;
  };
  ingredients_text?: string;
  nutritionInfo?: {
    caloriesPerServing?: number;
    servingSize?: string;
    carbs?: {
      amount: number;
      dailyValue: number;
    };
    protein?: {
      amount: number;
      dailyValue: number;
    };
    fat?: {
      amount: number;
      dailyValue: number;
    };
  };
  ingredients?: string[];
}

export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [isRecipeMode, setIsRecipeMode] = useState(false);
  const [isReceiptMode, setIsReceiptMode] = useState(false);
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
          nutrition: data.product.nutriments,
          ingredients: data.product.ingredients_text,
        });

        // Process nutritional information
        const nutritionInfo = data.product.nutriments
          ? {
              caloriesPerServing: data.product.nutriments.energy_100g,
              servingSize: data.product.nutriments.serving_size || "100g",
              carbs: {
                amount: data.product.nutriments.carbohydrates_100g,
                dailyValue: Math.round(
                  ((data.product.nutriments.carbohydrates_100g || 0) / 275) *
                    100
                ), // Based on 275g daily value
              },
              protein: {
                amount: data.product.nutriments.proteins_100g,
                dailyValue: Math.round(
                  ((data.product.nutriments.proteins_100g || 0) / 50) * 100
                ), // Based on 50g daily value
              },
              fat: {
                amount: data.product.nutriments.fat_100g,
                dailyValue: Math.round(
                  ((data.product.nutriments.fat_100g || 0) / 65) * 100
                ), // Based on 65g daily value
              },
            }
          : undefined;

        // Process ingredients
        const ingredients = data.product.ingredients_text
          ? data.product.ingredients_text
              .split(",")
              .map((i: string) => i.trim())
          : undefined;

        return {
          ...data.product,
          nutritionInfo,
          ingredients,
        };
      }
      console.log("[Scan] Product not found in Open Food Facts");
      return null;
    } catch (error) {
      console.error("[Scan] Error fetching product info:", error);
      return null;
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    try {
      setScanning(false);
      setLoading(true);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to scan products");
        return;
      }

      const productInfo = await fetchProductInfo(data);
      if (!productInfo) {
        Alert.alert("Product Not Found", "Would you like to add it manually?", [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setScanning(true),
          },
          {
            text: "Add Manually",
            onPress: () => router.push("/manual-entry"),
          },
        ]);
        return;
      }

      if (isRecipeMode) {
        // Handle recipe scanning
        const predictedExpiryDate = getExpiryDate(productInfo);
        const encodedEmail = encodeURIComponent(currentUser.email.replace(/\./g, ","));
        
        // Add each ingredient as a separate product
        if (productInfo.ingredients) {
          for (const ingredient of productInfo.ingredients) {
            const ingredientRef = ref(database, `users/${encodedEmail}/products/${Date.now()}-${ingredient}`);
            await set(ingredientRef, {
              name: ingredient,
              expiryDate: predictedExpiryDate.toISOString(),
              category: productInfo.categories_tags?.[0] || "other",
              quantity: 1,
              imageUrl: productInfo.image_url,
            });
          }
        }
        
        Alert.alert("Success", "Recipe ingredients have been added to your inventory!");
        router.push("/");
      } else {
        // Regular product scanning
        const predictedExpiryDate = getExpiryDate(productInfo);
        router.push({
          pathname: "/product",
          params: {
            barcode: data,
            name: productInfo.product_name,
            brand: productInfo.brands,
            imageUrl: productInfo.image_url,
            category: productInfo.categories_tags?.[0],
            nutritionInfo: JSON.stringify(productInfo.nutritionInfo),
            ingredients: JSON.stringify(productInfo.ingredients),
            expiryDate: predictedExpiryDate.toISOString(),
          },
        });
      }
    } catch (error) {
      console.error("Error handling barcode:", error);
      Alert.alert("Error", "Failed to process barcode. Please try again.");
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptScan = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        await processReceiptImage(imageUri);
      }
    } catch (error) {
      console.error("Error scanning receipt:", error);
      Alert.alert("Error", "Failed to process receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processReceiptImage = async (imageUri: string) => {
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Here you would typically send the image to an OCR service
      // For now, we'll simulate OCR with a mock response
      const mockOcrResult = {
        text: "MILK 2% 1GAL\nBREAD WHITE LOAF\nEGGS DOZEN\nBANANAS 2LB",
        confidence: 0.95,
      };

      // Parse the OCR result
      const products = parseReceiptText(mockOcrResult.text);
      
      // Add products to database
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to scan receipts");
        return;
      }

      const encodedEmail = encodeURIComponent(currentUser.email.replace(/\./g, ","));
      
      for (const product of products) {
        const productRef = ref(database, `users/${encodedEmail}/products/${Date.now()}-${product.name}`);
        await set(productRef, {
          name: product.name,
          expiryDate: product.expiryDate.toISOString(),
          category: product.category,
          quantity: product.quantity,
        });
      }

      Alert.alert("Success", "Receipt items have been added to your inventory!");
      router.push("/");
    } catch (error) {
      console.error("Error processing receipt:", error);
      Alert.alert("Error", "Failed to process receipt. Please try again.");
    }
  };

  const parseReceiptText = (text: string) => {
    // Split text into lines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      // Simple parsing logic - in a real app this would be more sophisticated
      const parts = line.split(' ');
      const quantity = parseInt(parts[0]) || 1;
      const name = parts.slice(1).join(' ').toLowerCase();
      
      // Predict expiry date based on product name
      const expiryDate = getExpiryDate({ product_name: name });
      
      // Determine category based on product name
      const category = determineCategory(name);
      
      return {
        name,
        quantity,
        expiryDate,
        category,
      };
    });
  };

  const determineCategory = (name: string) => {
    // Simple category determination - in a real app this would be more sophisticated
    const categories = {
      dairy: ['milk', 'cheese', 'yogurt', 'cream'],
      bakery: ['bread', 'bun', 'roll', 'bagel'],
      produce: ['banana', 'apple', 'orange', 'lettuce'],
      meat: ['beef', 'chicken', 'pork', 'turkey'],
      eggs: ['egg'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }

    return 'other';
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
              <Text style={styles.scanText}>
                {isRecipeMode ? "Scan recipe ingredients" : "Position barcode within frame"}
              </Text>
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
            <Text style={styles.loadingText}>Processing...</Text>
          </LinearGradient>
        </Surface>
      )}
      <View style={styles.fabContainer}>
        <FAB
          icon={isRecipeMode ? "food" : "barcode-scan"}
          style={[styles.fab, styles.fabLeft]}
          onPress={() => setIsRecipeMode(!isRecipeMode)}
          label={isRecipeMode ? "Recipe Mode" : "Product Mode"}
        />
        <FAB
          icon="receipt"
          style={[styles.fab, styles.fabRight]}
          onPress={handleReceiptScan}
          label="Scan Receipt"
        />
      </View>
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
  fabContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  fab: {
    margin: 0,
  },
  fabLeft: {
    marginRight: 8,
  },
  fabRight: {
    marginLeft: 8,
  },
});
