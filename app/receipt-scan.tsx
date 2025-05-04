import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
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
  Divider,
  Text,
  useTheme,
} from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  where,
} from "firebase/firestore";

const { width, height } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(width, height) * 0.7;

type ReceiptItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  barcode?: string;
};

export default function ReceiptScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(
    null
  );
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    const checkPermissions = async () => {
      if (permission?.granted) {
        setHasPermission(true);
      } else if (permission === null) {
        // still loading
      } else if (permission.canAskAgain) {
        const { granted } = await requestPermission();
        setHasPermission(granted);
      } else {
        setHasPermission(false);
      }
    };

    checkPermissions();
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned || !isScanning || processingRef.current) return;

    // Prevent scanning the same barcode multiple times
    if (lastScannedBarcode === data) return;
    setLastScannedBarcode(data);

    setScanned(true);
    setIsScanning(false);
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // In a real app, this would connect to a receipt parsing API or OCR service
      // For demo purposes, we'll simulate receipt parsing with a delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulate parsed receipt data
      const mockItems: ReceiptItem[] = [
        {
          id: Math.random().toString(36).substring(7),
          name: "Organic Milk",
          quantity: 1,
          price: 3.99,
          barcode: "5901234123457",
        },
        {
          id: Math.random().toString(36).substring(7),
          name: "Whole Wheat Bread",
          quantity: 2,
          price: 2.49,
          barcode: "7501234567890",
        },
        {
          id: Math.random().toString(36).substring(7),
          name: "Free Range Eggs",
          quantity: 1,
          price: 4.99,
          barcode: "8901234567890",
        },
        {
          id: Math.random().toString(36).substring(7),
          name: "Organic Avocado",
          quantity: 3,
          price: 1.79,
          barcode: "9901234567890",
        },
      ];

      setReceiptItems(mockItems);
    } catch (error) {
      console.error("Error processing receipt:", error);
      Alert.alert(
        "Error",
        "Failed to process receipt. Please try again."
      );
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanned(false);
    setLastScannedBarcode(null);
    setReceiptItems([]);
    processingRef.current = false;
  };

  const handleAddAllItems = async () => {
    if (receiptItems.length === 0) return;

    try {
      setIsProcessing(true);
      const db = getFirestore(firebaseApp);
      
      // Create a batch to add all items
      const promises = receiptItems.map(async (item) => {
        const productRef = doc(db, "products", item.barcode || item.id);
        
        // Check if product already exists
        const productSnap = await getDoc(productRef);
        
        // Calculate default expiry date (14 days from now for demonstration)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);
        
        return setDoc(productRef, {
          name: item.name,
          barcode: item.barcode || item.id,
          expiryDate: expiryDate.toISOString().split("T")[0],
          addedAt: new Date().toISOString(),
          quantity: item.quantity,
          price: item.price,
          fromReceipt: true,
        }, { merge: true });
      });
      
      await Promise.all(promises);
      
      Alert.alert(
        "Success",
        `Added ${receiptItems.length} items from your receipt!`,
        [
          {
            text: "OK",
            onPress: () => router.push("/"),
          },
        ]
      );
    } catch (error) {
      console.error("Error adding receipt items:", error);
      Alert.alert(
        "Error",
        "Failed to add items from receipt. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const removeItem = (id: string) => {
    setReceiptItems(receiptItems.filter(item => item.id !== id));
  };

  if (permission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting for camera permission</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>No access to camera</Text>
        <Button mode="contained" onPress={requestPermission}>
          Grant Permission
        </Button>
        <Button
          mode="outlined"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isScanning && !scanned && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417", "code128"],
          }}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Text style={styles.instructionText}>
              Scan your receipt barcode or QR code
            </Text>
            <Button
              mode="contained"
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
            >
              Cancel
            </Button>
          </View>
        </CameraView>
      )}

      {(!isScanning || scanned) && (
        <View style={styles.resultsContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            Receipt Items
          </Text>

          {isProcessing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Processing receipt...</Text>
            </View>
          ) : receiptItems.length > 0 ? (
            <>
              <ScrollView style={styles.itemList}>
                {receiptItems.map((item) => (
                  <Card key={item.id} style={styles.itemCard}>
                    <Card.Content>
                      <View style={styles.itemHeader}>
                        <Text variant="titleMedium">{item.name}</Text>
                        <TouchableOpacity onPress={() => removeItem(item.id)}>
                          <MaterialCommunityIcons
                            name="close-circle"
                            size={24}
                            color={theme.colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                      <Divider style={styles.divider} />
                      <View style={styles.itemDetails}>
                        <Chip icon="tag">${item.price.toFixed(2)}</Chip>
                        <Chip icon="numeric">{item.quantity}x</Chip>
                        {item.barcode && (
                          <Chip icon="barcode">{item.barcode.substring(0, 6)}...</Chip>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </ScrollView>
              
              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  onPress={handleAddAllItems}
                  style={styles.actionButton}
                  disabled={isProcessing}
                >
                  Add All Items
                </Button>
                <Button
                  mode="outlined"
                  onPress={startScanning}
                  style={styles.actionButton}
                >
                  Scan Again
                </Button>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="receipt"
                size={64}
                color={theme.colors.outline}
              />
              <Text style={styles.emptyStateText}>No receipt scanned</Text>
              <Button mode="contained" onPress={startScanning} style={styles.scanButton}>
                Scan Receipt
              </Button>
              <Button mode="outlined" onPress={() => router.push("/")} style={styles.backButton}>
                Back to Home
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE / 2,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: "#fff",
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderColor: "#fff",
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#fff",
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderColor: "#fff",
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    marginTop: 20,
  },
  cancelButton: {
    position: "absolute",
    bottom: 50,
    width: "80%",
    alignSelf: "center",
  },
  backButton: {
    marginTop: 10,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    marginVertical: 16,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  itemList: {
    flex: 1,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: {
    marginVertical: 8,
  },
  itemDetails: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButtons: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  scanButton: {
    marginTop: 20,
    width: "80%",
  },
}); 