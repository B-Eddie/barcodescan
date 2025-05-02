import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Text, Appbar, Button } from "react-native-paper";
import { Camera } from "expo-camera";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseApp } from "../firebaseConfig";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    try {
      // Query Firestore for product by barcode using JS SDK
      const db = getFirestore(firebaseApp);
      const docRef = doc(db, "products", data);
      const docSnap = await getDoc(docRef);
      let product = docSnap.exists() ? docSnap.data() : null;
      if (!product) {
        Alert.alert("Product not found", "Enter details manually.", [
          {
            text: "OK",
            onPress: () =>
              router.push({
                pathname: "/manual-entry",
                params: { barcode: data },
              }),
          },
        ]);
        setLoading(false);
        return;
      }
      // If expiry date missing, prompt for manual entry
      if (!product.expiryDate) {
        Alert.alert("Expiry Date Missing", "Please enter the expiry date.", [
          {
            text: "OK",
            onPress: () =>
              router.push({
                pathname: "/manual-entry",
                params: {
                  barcode: data,
                  name: product.name,
                  imageUrl: product.imageUrl,
                },
              }),
          },
        ]);
        setLoading(false);
        return;
      }
      // Navigate to product detail
      router.push({
        pathname: "/product-detail",
        params: { barcode: data, ...product },
      });
    } catch (e) {
      Alert.alert("Scan Error", "Failed to fetch product info. Try again?");
    }
    setLoading(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text>No camera access.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Scan Barcode" />
      </Appbar.Header>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#222",
        }}
      >
        {!scanned && (
          <View
            style={{
              width: 280,
              height: 280,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 2,
              borderColor: "#fff",
            }}
          >
            <Camera
              ref={cameraRef}
              style={{ width: 280, height: 280 }}
              onBarCodeScanned={handleBarCodeScanned}
              barCodeScannerSettings={{
                barCodeTypes: ["ean13", "upc_a", "qr"],
              }}
            />
            <MaterialCommunityIcons
              name="barcode-scan"
              size={48}
              color="#fff"
              style={{
                position: "absolute",
                top: 116,
                left: 116,
                opacity: 0.5,
              }}
            />
          </View>
        )}
        {loading && (
          <ActivityIndicator
            style={{ position: "absolute", top: "50%", left: "50%" }}
          />
        )}
        {scanned && !loading && (
          <Button
            mode="contained"
            onPress={() => setScanned(false)}
            style={{ margin: 16 }}
            icon="camera"
          >
            Scan Again
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
