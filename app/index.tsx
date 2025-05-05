import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { get, ref, remove } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Card,
  IconButton,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

interface Product {
  id: string;
  name: string;
  expiryDate: string;
  category: string;
  quantity: number;
  imageUrl?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productsRef = ref(database, `users/${encodedEmail}/products`);
      const snapshot = await get(productsRef);

      const productsList: Product[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          productsList.push({
            id: childSnapshot.key || "",
            name: data.name,
            expiryDate: data.expiryDate,
            category: data.category,
            quantity: data.quantity,
            imageUrl: data.imageUrl,
          });
        });
      }

      // Sort by expiry date
      productsList.sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );

      setProducts(productsList);
    } catch (error) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (productId: string) => {
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
              setDeleting(productId);
              const currentUser = auth.currentUser;
              if (!currentUser?.email) {
                throw new Error("User not logged in");
              }

              const encodedEmail = encodeURIComponent(
                currentUser.email.replace(/\./g, ",")
              );
              const productRef = ref(
                database,
                `users/${encodedEmail}/products/${productId}`
              );
              await remove(productRef);

              // Update local state
              setProducts(products.filter((p) => p.id !== productId));
              Alert.alert("Success", "Product deleted successfully");
            } catch (error) {
              console.error("Error deleting product:", error);
              Alert.alert("Error", "Failed to delete product");
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (productId: string) => {
    return (
      <View style={styles.deleteAction}>
        <IconButton
          icon="delete"
          iconColor="#fff"
          size={24}
          onPress={() => handleDelete(productId)}
          disabled={deleting === productId}
        />
      </View>
    );
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return theme.colors.error;
    if (days <= 3) return theme.colors.error;
    if (days <= 7) return theme.colors.warning;
    return theme.colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchProducts(true)}
        />
      }
    >
      {products.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No products added yet. Scan a barcode to get started!
            </Text>
          </Card.Content>
        </Card>
      ) : (
        products.map((product) => {
          const daysUntilExpiry = Math.ceil(
            (new Date(product.expiryDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return (
            <Swipeable
              key={product.id}
              renderRightActions={() => renderRightActions(product.id)}
            >
              <Card
                style={styles.card}
                onPress={() =>
                  router.push(`/product-detail?barcode=${product.id}`)
                }
              >
                <Card.Content style={styles.cardContent}>
                  {product.imageUrl && (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium">{product.name}</Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: getExpiryColor(daysUntilExpiry) }}
                    >
                      {daysUntilExpiry < 0
                        ? "Expired"
                        : daysUntilExpiry === 0
                        ? "Expires today"
                        : `Expires in ${daysUntilExpiry} days`}
                    </Text>
                    <Text variant="bodySmall">
                      {new Date(product.expiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </Swipeable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: "#f5f5f5",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
  },
  deleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 8,
    marginRight: 16,
    borderRadius: 8,
  },
});
