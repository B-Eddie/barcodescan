import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { push, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import AppLayout from "../components/AppLayout";
import { auth, database } from "../firebaseConfig";
import { analyzeReceipt } from "../services/receiptAnalysis";

interface ReceiptItem {
  id: string;
  name: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  confidence: number;
  category: string;
  quantity: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ReceiptScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(true);

  // Animation values
  const cameraButtonScale = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(0.3)).current;

  // Handle incoming parameters from navigation
  useEffect(() => {
    if (params.imageUri && params.items && params.purchaseDate) {
      setReceiptImage(params.imageUri as string);
      setPurchaseDate(params.purchaseDate as string);

      try {
        const items = JSON.parse(params.items as string);
        setReceiptItems(items);
      } catch (error) {
        console.error("Error parsing items from params:", error);
        setError("Failed to load receipt results");
      }
    }
  }, [params.imageUri, params.items, params.purchaseDate]);

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      setLoading(true);

      // Animate camera button
      Animated.sequence([
        Animated.timing(cameraButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cameraButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        setReceiptImage(photo.uri);
        setShowCamera(false);
        await processReceipt(photo.uri);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      setError("Failed to capture photo. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSelectFromGallery = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setReceiptImage(result.assets[0].uri);
        await processReceipt(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error selecting from gallery:", error);
      setError("Failed to select image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processReceipt = async (imageUri: string) => {
    try {
      setProcessing(true);
      setError(null);

      const result = await analyzeReceipt(imageUri);
      setReceiptItems(result.items);
      setPurchaseDate(result.purchaseDate);
    } catch (error) {
      console.error("Error processing receipt:", error);
      setError("Failed to analyze receipt. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
      {
        dairy: "cheese",
        meat: "food-steak",
        produce: "fruit-watermelon",
        vegetables: "carrot",
        bakery: "bread-slice",
        canned: "food-variant",
        frozen: "snowflake",
        snacks: "cookie",
        beverages: "cup",
        other: "food",
      };
    return icons[category] || icons.other;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "#4CAF50";
    if (confidence >= 0.7) return "#FFC107";
    return "#F44336";
  };

  const handleSaveItems = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to save items");
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );

      // Save each item to Firebase
      for (const item of receiptItems) {
        const newItemRef = push(
          ref(database, `users/${encodedEmail}/products`)
        );
        await set(newItemRef, {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          purchaseDate: item.purchaseDate,
          expiryDate: item.estimatedExpiryDate,
          confidence: item.confidence,
          addedAt: new Date().toISOString(),
        });
      }

      Alert.alert(
        "Success",
        `Saved ${receiptItems.length} items to your pantry!`,
        [{ text: "OK", onPress: () => router.push("/") }]
      );
    } catch (error) {
      console.error("Error saving items:", error);
      Alert.alert("Error", "Failed to save items to your pantry");
    }
  };

  // If we have results, show them
  if (receiptItems.length > 0) {
    return (
      <AppLayout>
        <ScrollView style={styles.container}>
          <Surface style={styles.card} elevation={2}>
            <View style={styles.header}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => router.back()}
              />
              <Text variant="headlineMedium" style={styles.title}>
                Receipt Analysis
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {receiptImage && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: receiptImage }}
                  style={styles.receiptImage}
                />
              </View>
            )}

            <View style={styles.resultsContainer}>
              <Text variant="titleLarge" style={styles.resultsTitle}>
                Found {receiptItems.length} Items
              </Text>
              <Text variant="bodyMedium" style={styles.purchaseDate}>
                Purchase Date: {purchaseDate}
              </Text>

              {receiptItems.map((item) => (
                <Card key={item.id} style={styles.itemCard}>
                  <Card.Content>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <MaterialCommunityIcons
                          name={getCategoryIcon(item.category)}
                          size={24}
                          color={theme.colors.primary}
                        />
                        <View style={styles.itemDetails}>
                          <Text variant="titleMedium">{item.name}</Text>
                          <Text variant="bodySmall" style={styles.category}>
                            {item.category} • Qty: {item.quantity}
                          </Text>
                        </View>
                      </View>
                      <Chip
                        style={[
                          styles.confidenceChip,
                          {
                            backgroundColor: getConfidenceColor(
                              item.confidence
                            ),
                          },
                        ]}
                        textStyle={styles.confidenceText}
                      >
                        {Math.round(item.confidence * 100)}% confidence
                      </Chip>
                    </View>

                    <View style={styles.datesContainer}>
                      <View style={styles.dateItem}>
                        <Text variant="bodySmall" style={styles.dateLabel}>
                          Purchase Date
                        </Text>
                        <Text variant="bodyMedium">{item.purchaseDate}</Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Text variant="bodySmall" style={styles.dateLabel}>
                          Estimated Expiry
                        </Text>
                        <Text variant="bodyMedium">
                          {item.estimatedExpiryDate}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              ))}

              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowCamera(true);
                    setReceiptImage(null);
                    setReceiptItems([]);
                    setPurchaseDate(null);
                    setError(null);
                  }}
                  style={styles.actionButton}
                  icon="camera"
                >
                  Back to Camera
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveItems}
                  style={styles.actionButton}
                  icon="check"
                >
                  Save Items
                </Button>
              </View>
            </View>
          </Surface>
        </ScrollView>
      </AppLayout>
    );
  }

  // Show camera interface if no results
  if (showCamera && !receiptImage) {
    // Check camera permissions
    if (!permission) {
      return (
        <AppLayout>
          <View style={styles.container}>
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>
                Requesting camera permissions...
              </Text>
            </View>
          </View>
        </AppLayout>
      );
    }

    if (!permission.granted) {
      return (
        <AppLayout>
          <View style={styles.container}>
            <View style={styles.permissionContainer}>
              <MaterialCommunityIcons
                name="camera-off"
                size={48}
                color={theme.colors.outline}
              />
              <Text style={styles.permissionText}>
                Camera access is required to scan receipts
              </Text>
              <Button
                mode="contained"
                onPress={requestPermission}
                style={styles.permissionButton}
              >
                Grant Camera Permission
              </Button>
            </View>
          </View>
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={cameraType}>
            {/* Camera Overlay */}
            <View style={styles.cameraOverlay}>
              {/* Header with back button */}
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>Scan Receipt</Text>
                <TouchableOpacity
                  style={styles.galleryButton}
                  onPress={handleSelectFromGallery}
                >
                  <MaterialCommunityIcons
                    name="image"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              {/* Receipt Frame */}
              <View style={styles.receiptFrame}>
                <View style={styles.frameOutline}>
                  <View style={styles.frameCorner} />
                  <View
                    style={[styles.frameCorner, styles.frameCornerTopRight]}
                  />
                  <View
                    style={[styles.frameCorner, styles.frameCornerBottomLeft]}
                  />
                  <View
                    style={[styles.frameCorner, styles.frameCornerBottomRight]}
                  />
                </View>

                <Text style={styles.frameText}>
                  Position receipt within frame
                </Text>
              </View>

              {/* Controls */}
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={toggleCameraType}
                >
                  <MaterialCommunityIcons
                    name="camera-flip"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>

                <Animated.View
                  style={[
                    styles.captureButtonContainer,
                    { transform: [{ scale: cameraButtonScale }] },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={handleCapturePhoto}
                    disabled={loading}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.placeholder} />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.processingText}>
                    Analyzing receipt...
                  </Text>
                </View>
              )}
            </View>
          </CameraView>
        </View>
      </AppLayout>
    );
  }

  // Show preview interface if we have an image
  return (
    <AppLayout>
      <ScrollView style={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => {
                setShowCamera(true);
                setReceiptImage(null);
                setReceiptItems([]);
                setPurchaseDate(null);
                setError(null);
              }}
            />
            <Text variant="headlineMedium" style={styles.title}>
              Receipt Preview
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {receiptImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: receiptImage }}
                style={styles.receiptImage}
              />
            </View>
          )}

          {processing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.processingText}>Analyzing receipt...</Text>
            </View>
          )}

          {error && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          )}

          {!processing && !error && (
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowCamera(true);
                  setReceiptImage(null);
                  setError(null);
                }}
                style={styles.actionButton}
                icon="camera"
              >
                Retake Photo
              </Button>
              <Button
                mode="contained"
                onPress={() => processReceipt(receiptImage!)}
                style={styles.actionButton}
                icon="magnify"
                loading={processing}
                disabled={processing}
              >
                Analyze Receipt
              </Button>
            </View>
          )}
        </Surface>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  card: {
    margin: 16,
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
  errorText: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: "column",
    gap: 12,
    marginTop: 8,
  },
  cameraButton: {
    marginTop: 0,
  },
  galleryButtonOld: {
    marginTop: 0,
  },
  imageContainer: {
    position: "relative",
    marginVertical: 16,
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  processingContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  processingText: {
    marginTop: 12,
    color: "#666",
  },
  resultsContainer: {
    marginTop: 24,
  },
  resultsTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  purchaseDate: {
    color: "#666",
    marginBottom: 16,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  category: {
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  confidenceChip: {
    marginLeft: 8,
  },
  confidenceText: {
    color: "#fff",
    fontWeight: "600",
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    color: "#666",
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cameraTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 30,
    position: "relative",
  },
  frameOutline: {
    width: screenWidth - 80,
    height: (screenWidth - 80) * 1.4, // Rectangle aspect ratio for receipts
    position: "relative",
  },
  frameCorner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: "white",
    top: -3,
    left: -3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  frameCornerTopRight: {
    top: -3,
    right: -3,
    left: undefined,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  frameCornerBottomLeft: {
    bottom: -3,
    left: -3,
    top: undefined,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  frameCornerBottomRight: {
    bottom: -3,
    right: -3,
    top: undefined,
    left: undefined,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  frameText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  placeholder: {
    width: 50,
    height: 50,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
    color: "#666",
  },
  permissionButton: {
    marginTop: 20,
  },
  errorContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(244, 67, 54, 0.9)",
    padding: 15,
    borderRadius: 10,
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});
