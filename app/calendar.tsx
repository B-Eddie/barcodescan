import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Card,
  Chip,
  Divider,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

interface ExpiryDate {
  id: string;
  name: string;
  date: string;
  daysUntilExpiry: number;
  imageUrl?: string;
  category?: string;
  quantity?: number;
}

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [expiryDates, setExpiryDates] = useState<ExpiryDate[]>([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Cache keys
  const CACHE_KEY = "calendar_dates_cache";
  const CACHE_TIMESTAMP_KEY = "calendar_dates_cache_timestamp";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchExpiryDates = async (isRefreshing = false) => {
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

      // Check cache first
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cacheTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();

      if (
        cachedData &&
        cacheTimestamp &&
        now - parseInt(cacheTimestamp) < CACHE_DURATION
      ) {
        const dates = JSON.parse(cachedData);
        setExpiryDates(dates);
        updateMarkedDates(dates);
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );

      const productsRef = ref(database, `users/${encodedEmail}/products`);
      const snapshot = await get(productsRef);

      const dates: ExpiryDate[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          if (data && data.expiryDate) {
            const daysUntilExpiry = Math.ceil(
              (new Date(data.expiryDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );
            dates.push({
              id: childSnapshot.key || "",
              name: data.name,
              date: data.expiryDate,
              daysUntilExpiry,
              imageUrl: data.imageUrl,
              category: data.category,
              quantity: data.quantity,
            });
          }
        });
      }

      dates.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dates));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

      setExpiryDates(dates);
      updateMarkedDates(dates);
    } catch (error) {
      console.error("Error fetching expiry dates:", error);
      Alert.alert("Error", "Failed to load expiry dates. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateMarkedDates = (dates: ExpiryDate[]) => {
    const marked: any = {};
    dates.forEach((date) => {
      marked[date.date] = {
        selected: true,
        selectedColor: getExpiryColor(date.daysUntilExpiry),
        dotColor: getExpiryColor(date.daysUntilExpiry),
        marked: true,
      };
    });
    setMarkedDates(marked);
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return theme.colors.error;
    if (days <= 3) return theme.colors.error;
    if (days <= 7) return theme.colors.warning;
    return theme.colors.primary;
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return "Expired";
    if (days === 0) return "Expires Today";
    if (days === 1) return "Expires Tomorrow";
    return `Expires in ${days} days`;
  };

  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, string> = {
      dairy: "cheese",
      meat: "food-steak",
      fruits: "fruit-watermelon",
      vegetables: "carrot",
      bakery: "bread-slice",
      canned: "food-variant",
      frozen: "snowflake",
      snacks: "cookie",
      default: "food",
    };
    return icons[category || "default"] || "food";
  };

  useEffect(() => {
    fetchExpiryDates();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchExpiryDates(true);
  }, []);

  const filteredDates = expiryDates.filter(
    (date) => date.date === selectedDate
  );

  const upcomingExpiries = expiryDates
    .filter((date) => date.daysUntilExpiry >= 0 && date.daysUntilExpiry <= 7)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.calendarContainer}>
          <RNCalendar
            markedDates={markedDates}
            markingType="dot"
            onDayPress={(day) => setSelectedDate(day.dateString)}
            theme={{
              selectedDayBackgroundColor: theme.colors.primary,
              todayTextColor: theme.colors.primary,
              dotColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.primary,
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "500",
              "stylesheet.calendar.header": {
                dayTextAtIndex0: {
                  color: theme.colors.error,
                },
                dayTextAtIndex6: {
                  color: theme.colors.primary,
                },
              },
            }}
          />
        </View>

        <View style={styles.legendContainer}>
          <Chip
            icon="alert"
            style={[styles.legendChip, { backgroundColor: theme.colors.error }]}
          >
            Expired/Urgent
          </Chip>
          <Chip
            icon="clock"
            style={[
              styles.legendChip,
              { backgroundColor: theme.colors.warning },
            ]}
          >
            Soon
          </Chip>
          <Chip
            icon="check"
            style={[
              styles.legendChip,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            Good
          </Chip>
        </View>

        {upcomingExpiries.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Upcoming Expiries
            </Text>
            {upcomingExpiries.map((date) => (
              <Card
                key={date.id}
                style={styles.card}
                onPress={() =>
                  router.push(`/product-detail?barcode=${date.id}`)
                }
              >
                <Card.Content>
                  <View style={styles.cardContent}>
                    {date.imageUrl && (
                      <Image
                        source={{ uri: date.imageUrl }}
                        style={styles.image}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.textContainer}>
                      <Text variant="titleMedium">{date.name}</Text>
                      <View style={styles.statusContainer}>
                        <Chip
                          icon={getCategoryIcon(date.category)}
                          style={[
                            styles.statusChip,
                            {
                              backgroundColor: getExpiryColor(
                                date.daysUntilExpiry
                              ),
                            },
                          ]}
                        >
                          {getExpiryStatus(date.daysUntilExpiry)}
                        </Chip>
                      </View>
                      <Text variant="bodySmall">
                        {new Date(date.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <Divider style={styles.divider} />

        <Text variant="titleLarge" style={styles.sectionTitle}>
          {new Date(selectedDate).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : filteredDates.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No items expiring on this date
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredDates.map((date) => (
            <Card
              key={date.id}
              style={styles.card}
              onPress={() => router.push(`/product-detail?barcode=${date.id}`)}
            >
              <Card.Content>
                <View style={styles.cardContent}>
                  {date.imageUrl && (
                    <Image
                      source={{ uri: date.imageUrl }}
                      style={styles.image}
                      contentFit="cover"
                    />
                  )}
                  <View style={styles.textContainer}>
                    <Text variant="titleMedium">{date.name}</Text>
                    <View style={styles.statusContainer}>
                      <Chip
                        icon={getCategoryIcon(date.category)}
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor: getExpiryColor(
                              date.daysUntilExpiry
                            ),
                          },
                        ]}
                      >
                        {getExpiryStatus(date.daysUntilExpiry)}
                      </Chip>
                    </View>
                    {date.quantity && (
                      <Text variant="bodySmall">Quantity: {date.quantity}</Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
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
  },
  calendarContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
    gap: 8,
  },
  legendChip: {
    marginHorizontal: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 16,
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 16,
  },
  loader: {
    marginTop: 20,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
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
  statusContainer: {
    marginTop: 8,
  },
  statusChip: {
    alignSelf: "flex-start",
  },
});
