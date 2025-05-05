import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Chip,
  IconButton,
  Surface,
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
  const [fadeAnim] = useState(new Animated.Value(0));
  const { width } = Dimensions.get("window");

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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

  if (loading) {
    return (
      <LinearGradient
        colors={["#f6f7f9", "#ffffff"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your calendar...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f6f7f9", "#ffffff"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Surface style={styles.calendarCard} elevation={4}>
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
          </Surface>

          <Surface style={styles.legendCard} elevation={4}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Legend
            </Text>
            <View style={styles.legendContainer}>
              <Chip
                icon="alert"
                style={[
                  styles.legendChip,
                  { backgroundColor: theme.colors.error },
                ]}
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
          </Surface>

          {upcomingExpiries.length > 0 && (
            <Surface style={styles.upcomingCard} elevation={4}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Upcoming Expiries
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.upcomingScroll}
              >
                {upcomingExpiries.map((date) => (
                  <TouchableOpacity
                    key={date.id}
                    onPress={() =>
                      router.push(`/product-detail?barcode=${date.id}`)
                    }
                  >
                    <LinearGradient
                      colors={["#ffffff", "#f8f9fa"]}
                      style={styles.upcomingItem}
                    >
                      <IconButton
                        icon={getCategoryIcon(date.category)}
                        size={32}
                        iconColor={theme.colors.primary}
                      />
                      <Text
                        variant="bodyMedium"
                        style={styles.upcomingName}
                        numberOfLines={1}
                      >
                        {date.name}
                      </Text>
                      <Chip
                        icon="clock"
                        style={[
                          styles.expiryChip,
                          {
                            backgroundColor:
                              date.daysUntilExpiry <= 3
                                ? theme.colors.error
                                : theme.colors.warning,
                          },
                        ]}
                        textStyle={{ color: "#fff" }}
                      >
                        {getExpiryStatus(date.daysUntilExpiry)}
                      </Chip>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Surface>
          )}

          <Surface style={styles.selectedDateCard} elevation={4}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {new Date(selectedDate).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {filteredDates.length === 0 ? (
              <View style={styles.emptyDate}>
                <IconButton
                  icon="calendar-blank"
                  size={48}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.emptyDateText}>
                  No items expiring on this date
                </Text>
              </View>
            ) : (
              filteredDates.map((date) => (
                <TouchableOpacity
                  key={date.id}
                  onPress={() =>
                    router.push(`/product-detail?barcode=${date.id}`)
                  }
                >
                  <LinearGradient
                    colors={["#ffffff", "#f8f9fa"]}
                    style={styles.productCard}
                  >
                    <View style={styles.productInfo}>
                      <IconButton
                        icon={getCategoryIcon(date.category)}
                        size={32}
                        iconColor={theme.colors.primary}
                      />
                      <View style={styles.productDetails}>
                        <Text variant="titleMedium" style={styles.productName}>
                          {date.name}
                        </Text>
                        <View style={styles.productMeta}>
                          <Chip
                            icon={getCategoryIcon(date.category)}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor: theme.colors.primaryContainer,
                              },
                            ]}
                            textStyle={{ color: theme.colors.primary }}
                          >
                            {date.category}
                          </Chip>
                          <Chip
                            icon="clock"
                            style={[
                              styles.expiryChip,
                              {
                                backgroundColor: getExpiryColor(
                                  date.daysUntilExpiry
                                ),
                              },
                            ]}
                            textStyle={{ color: "#fff" }}
                          >
                            {getExpiryStatus(date.daysUntilExpiry)}
                          </Chip>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </Surface>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  calendarCard: {
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  legendCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  legendChip: {
    marginHorizontal: 4,
  },
  upcomingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#fff",
  },
  upcomingScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  upcomingItem: {
    width: 160,
    padding: 16,
    marginRight: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  upcomingName: {
    textAlign: "center",
    marginVertical: 8,
    fontWeight: "500",
  },
  selectedDateCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#fff",
  },
  emptyDate: {
    padding: 32,
    alignItems: "center",
  },
  emptyDateText: {
    marginTop: 16,
    color: "#666",
    textAlign: "center",
  },
  productCard: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  productDetails: {
    flex: 1,
    marginLeft: 8,
  },
  productName: {
    marginBottom: 8,
    fontWeight: "600",
  },
  productMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    height: 32,
    borderRadius: 16,
  },
  expiryChip: {
    height: 32,
    borderRadius: 16,
  },
});
