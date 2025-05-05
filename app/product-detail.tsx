import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, remove } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

interface ProductData {
  name: string;
  expiryDate: string;
  category: string;
  quantity: number;
  imageUrl?: string;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { barcode } = useLocalSearchParams();
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [barcode]);

  const fetchProduct = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error("User not logged in");
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );
      const snapshot = await get(productRef);

      if (snapshot.exists()) {
        setProductData(snapshot.val());
      } else {
        Alert.alert("Error", "Product not found");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      Alert.alert("Error", "Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              const currentUser = auth.currentUser;
              if (!currentUser?.email) {
                throw new Error("User not logged in");
              }

              const encodedEmail = encodeURIComponent(
                currentUser.email.replace(/\./g, ",")
              );
              const productRef = ref(
                database,
                `users/${encodedEmail}/products/${barcode}`
              );
              await remove(productRef);

              Alert.alert("Success", "Product deleted successfully");
              router.back();
            } catch (error) {
              console.error("Error deleting product:", error);
              Alert.alert("Error", "Failed to delete product");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!productData) {
    return (
      <View style={styles.container}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(productData.expiryDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {productData.imageUrl && (
            <Image
              source={{ uri: productData.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          )}
          <Text variant="headlineMedium" style={styles.title}>
            {productData.name}
          </Text>
          <Text variant="bodyLarge" style={styles.barcode}>
            Barcode: {barcode}
          </Text>
          <Text variant="bodyLarge">
            Expires: {new Date(productData.expiryDate).toLocaleDateString()}
          </Text>
          <Text variant="bodyLarge">Days until expiry: {daysUntilExpiry}</Text>
          <Text variant="bodyLarge">Quantity: {productData.quantity}</Text>
          <Text variant="bodyLarge">Category: {productData.category}</Text>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => router.push(`/product?barcode=${barcode}`)}
          style={styles.button}
        >
          Edit Product
        </Button>
        <Button
          mode="contained"
          onPress={handleDelete}
          loading={deleting}
          disabled={deleting}
          style={[styles.button, styles.deleteButton]}
          buttonColor={theme.colors.error}
        >
          Delete Product
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  card: {
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  barcode: {
    fontFamily: "monospace",
    marginBottom: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
  deleteButton: {
    marginTop: 8,
  },
});
