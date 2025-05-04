import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

const { width, height } = Dimensions.get("window");
const SCAN_AREA_SIZE = Math.min(width, height) * 0.7;

export default function ScanScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(
    null
  );
  const isProcessing = useRef(false);

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

  const handleBarCodeScanned = ({ type, data }: BarcodeScanningResult) => {
    if (scanned || !isScanning || isProcessing.current) return;

    // Prevent scanning the same barcode multiple times
    if (lastScannedBarcode === data) return;
    setLastScannedBarcode(data);

    setScanned(true);
    setIsScanning(false);
    isProcessing.current = true;

    // Format the barcode type for display
    const formatBarcodeType = (type: string) => {
      switch (type.toLowerCase()) {
        case "ean13":
          return "EAN-13 (Standard Product Code)";
        case "ean8":
          return "EAN-8 (Short Product Code)";
        case "upc_e":
          return "UPC-E (Compressed UPC)";
        case "upc_a":
          return "UPC-A (Universal Product Code)";
        case "qr":
          return "QR Code";
        default:
          return type;
      }
    };

    Alert.alert(
      "Barcode Detected",
      `Type: ${formatBarcodeType(
        type
      )}\n\nCode: ${data}\n\nWhat would you like to do?`,
      [
        {
          text: "View Product",
          onPress: () => {
            isProcessing.current = false;
            router.push({
              pathname: "/product",
              params: { barcode: data },
            });
          },
        },
        {
          text: "Back to Home",
          onPress: () => {
            isProcessing.current = false;
            router.push("/");
          },
        },
      ]
    );
  };

  const startScanning = () => {
    setIsScanning(true);
    setScanned(false);
    setLastScannedBarcode(null);
    isProcessing.current = false;
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
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_e", "upc_a", "qr"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>
          {!isScanning && (
            <Button
              mode="contained"
              style={styles.scanButton}
              onPress={startScanning}
            >
              Start Scanning
            </Button>
          )}
          {isScanning && !scanned && (
            <Button
              mode="contained"
              style={styles.cancelButton}
              onPress={() => setIsScanning(false)}
            >
              Cancel
            </Button>
          )}
          {scanned && (
            <Button
              mode="contained"
              style={styles.scanAgainButton}
              onPress={startScanning}
            >
              Scan Again
            </Button>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
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
  scanButton: {
    position: "absolute",
    bottom: 50,
    width: "80%",
    alignSelf: "center",
  },
  cancelButton: {
    position: "absolute",
    bottom: 50,
    width: "80%",
    alignSelf: "center",
    backgroundColor: "#ff4444",
  },
  scanAgainButton: {
    position: "absolute",
    bottom: 50,
    width: "80%",
    alignSelf: "center",
  },
  backButton: {
    marginTop: 10,
  },
});
