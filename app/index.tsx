import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

interface ExpiryItem {
  id: string;
  name: string;
  expiryDate: string;
  daysUntilExpiry: number;
  imageUrl?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [upcomingItems, setUpcomingItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingItems = async () => {
      try {
        const db = getFirestore(firebaseApp);
        const productsRef = collection(db, "products");

        // Get current date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Query products with expiry dates in the future
        const q = query(
          productsRef,
          where("expiryDate", ">=", today.toISOString().split("T")[0]),
          orderBy("expiryDate", "asc")
        );

        const querySnapshot = await getDocs(q);
        const products: ExpiryItem[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const expiryDate = new Date(data.expiryDate);
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          products.push({
            id: doc.id,
            name: data.name || "Unknown Product",
            expiryDate: data.expiryDate,
            daysUntilExpiry: daysUntilExpiry,
            imageUrl: data.imageUrl,
          });
        });

        setUpcomingItems(products);
      } catch (error) {
        console.error("Error fetching upcoming items:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingItems();
  }, []);

  const getExpiryColor = (days: number) => {
    if (days <= 3) return theme.colors.error;
    if (days <= 7) return theme.colors.tertiary;
    return theme.colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading upcoming items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text variant="headlineMedium" style={styles.title}>
          Upcoming Expiries
        </Text>
        {upcomingItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming expiries</Text>
            <Text style={styles.emptyStateSubtext}>
              Scan a product and add an expiry date to see it here
            </Text>
          </View>
        ) : (
          upcomingItems.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardContent}>
                  <View>
                    <Text variant="titleMedium">{item.name}</Text>
                    <Text variant="bodyMedium">
                      Expires: {new Date(item.expiryDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    variant="titleLarge"
                    style={{ color: getExpiryColor(item.daysUntilExpiry) }}
                  >
                    {item.daysUntilExpiry} days
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
      <Button
        mode="contained"
        onPress={() => router.push("/scan")}
        style={styles.scanButton}
        icon={({ size, color }) => (
          <MaterialCommunityIcons
            name="barcode-scan"
            size={size}
            color={color}
          />
        )}
      >
        Scan Product
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanButton: {
    margin: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: "#666",
    textAlign: "center",
  },
});
