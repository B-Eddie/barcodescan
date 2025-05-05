import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, StyleSheet, View } from "react-native";
import { Button, Card, FAB, Text, useTheme } from "react-native-paper";
import { auth, database } from "../firebaseConfig";

const { width, height } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(width, height) * 0.7;

interface ScannedItem {
  barcode: string;
  name: string;
  quantity: number;
  category: string;
  expiryDate: string;
}

export default function ReceiptScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const checkPermissions = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to scan barcodes."
        );
        router.back();
      }
    }
  };

  const handleBarCodeScanned = async (barcode: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      Alert.alert("Error", "You must be logged in to scan products");
      return;
    }

    // Check if item is already scanned
    if (scannedItems.some((item) => item.barcode === barcode)) {
      Alert.alert("Duplicate", "This item has already been scanned");
      return;
    }

    try {
      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      // Check if product exists in database
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );
      const snapshot = await get(productRef);

      if (snapshot.exists()) {
        const product = snapshot.val();
        setScannedItems((prev) => [
          ...prev,
          {
            barcode,
            name: product.name,
            quantity: 1,
            category: product.category,
            expiryDate: product.expiryDate,
          },
        ]);
      } else {
        setScannedItems((prev) => [
          ...prev,
          {
            barcode,
            name: "Unknown Product",
            quantity: 1,
            category: "Other",
            expiryDate: "",
          },
        ]);
      }
    } catch (error) {
      console.error("Error checking product:", error);
      Alert.alert("Error", "Failed to check product. Please try again.");
    }
  };

  const startScanning = () => {
    setIsScanning(true);
  };

  const handleAddAllItems = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) {
      Alert.alert("Error", "You must be logged in to add products");
      return;
    }

    try {
      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const batch = {};

      for (const item of scannedItems) {
        batch[`users/${encodedEmail}/products/${item.barcode}`] = {
          name: item.name,
          expiryDate: item.expiryDate,
          category: item.category,
          quantity: item.quantity,
          addedAt: new Date().toISOString(),
          userId: currentUser.email,
        };
      }

      await update(ref(database), batch);
      setScannedItems([]);
      Alert.alert("Success", "All items have been added to your list");
      router.push("/");
    } catch (error) {
      console.error("Error adding items:", error);
      Alert.alert("Error", "Failed to add items. Please try again.");
    }
  };

  const removeItem = (barcode: string) => {
    setScannedItems((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.scannedItemsContainer}>
        {scannedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="headlineMedium" style={styles.emptyText}>
              No items scanned yet
            </Text>
            <Text variant="bodyLarge" style={styles.emptySubtext}>
              Scan items from your receipt to add them
            </Text>
          </View>
        ) : (
          scannedItems.map((item) => (
            <Card key={item.barcode} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleLarge">{item.name}</Text>
                  <Button
                    icon="delete"
                    onPress={() => removeItem(item.barcode)}
                    mode="text"
                  >
                    Remove
                  </Button>
                </View>
                <Text variant="bodyMedium">Barcode: {item.barcode}</Text>
                <Text variant="bodyMedium">Quantity: {item.quantity}</Text>
                <Text variant="bodyMedium">Category: {item.category}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </View>

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={handleAddAllItems}
          disabled={scannedItems.length === 0}
          style={styles.addButton}
        >
          Add All Items
        </Button>
      </View>

      <FAB
        icon="barcode-scan"
        style={styles.fab}
        onPress={() => setIsScanning(true)}
      />

      {isScanning && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a", "qr"],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <Button
              mode="contained"
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scannedItemsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    color: "#666",
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  actionsContainer: {
    padding: 16,
  },
  addButton: {
    marginBottom: 16,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
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
  cancelButton: {
    position: "absolute",
    bottom: 50,
    width: "80%",
    alignSelf: "center",
    backgroundColor: "#ff4444",
  },
});
