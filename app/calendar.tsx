import { Image } from "expo-image";
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
import { StyleSheet, View } from "react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { Card, Text, useTheme } from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

interface ExpiryDate {
  id: string;
  name: string;
  date: string;
  daysUntilExpiry: number;
  imageUrl?: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [expiryDates, setExpiryDates] = useState<ExpiryDate[]>([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpiryDates = async () => {
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
        const products: ExpiryDate[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const expiryDate = new Date(data.expiryDate);
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          products.push({
            id: doc.id,
            name: data.name || "Unknown Product",
            date: data.expiryDate,
            daysUntilExpiry: daysUntilExpiry,
            imageUrl: data.imageUrl,
          });
        });

        setExpiryDates(products);

        // Create marked dates for the calendar
        const marks = products.reduce((acc, item) => {
          acc[item.date] = {
            marked: true,
            dotColor:
              item.daysUntilExpiry <= 3
                ? theme.colors.error
                : theme.colors.tertiary,
          };
          return acc;
        }, {} as any);

        setMarkedDates(marks);
      } catch (error) {
        console.error("Error fetching expiry dates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiryDates();
  }, [theme.colors]);

  const getExpiryColor = (days: number) => {
    if (days <= 3) return theme.colors.error;
    if (days <= 7) return theme.colors.tertiary;
    return theme.colors.primary;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading expiry dates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNCalendar
        markedDates={markedDates}
        theme={{
          todayTextColor: theme.colors.primary,
          selectedDayBackgroundColor: theme.colors.primary,
          dotColor: theme.colors.primary,
        }}
      />
      <View style={styles.listContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          Upcoming Expiries
        </Text>
        {expiryDates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming expiries</Text>
            <Text style={styles.emptyStateSubtext}>
              Scan a product and add an expiry date to see it here
            </Text>
          </View>
        ) : (
          expiryDates.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardContent}>
                  <View style={styles.productInfo}>
                    {item.imageUrl && (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.productImage}
                        contentFit="cover"
                      />
                    )}
                    <View>
                      <Text variant="titleMedium">{item.name}</Text>
                      <Text variant="bodyMedium">
                        Expires: {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContainer: {
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
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
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
    color: "#666",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
