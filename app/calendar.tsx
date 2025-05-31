import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Card,
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
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));
  const { width, height } = Dimensions.get("window");

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
        now - parseInt(cacheTimestamp) < CACHE_DURATION &&
        !isRefreshing
      ) {
        const dates = JSON.parse(cachedData);
        setExpiryDates(dates);
        updateMarkedDates(dates);
        animateIn();
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

      if (!isRefreshing) {
        animateIn();
      }
    } catch (error) {
      console.error("Error fetching expiry dates:", error);
      Alert.alert("Error", "Failed to load expiry dates. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const updateMarkedDates = (dates: ExpiryDate[]) => {
    const marked: any = {};
    const today = new Date().toISOString().split("T")[0];

    // Mark today
    marked[today] = {
      selected: true,
      selectedColor: theme.colors.primary,
      selectedTextColor: "#fff",
    };

    dates.forEach((date) => {
      const color = getExpiryColor(date.daysUntilExpiry);
      marked[date.date] = {
        marked: true,
        dotColor: color,
        selectedColor: date.date === selectedDate ? color : undefined,
        selected: date.date === selectedDate,
        selectedTextColor: date.date === selectedDate ? "#fff" : undefined,
      };
    });

    setMarkedDates(marked);
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return "#FF5252"; // Red for expired
    if (days <= 3) return "#FF7043"; // Orange-red for critical
    if (days <= 7) return "#FFB74D"; // Orange for warning
    if (days <= 14) return "#FFF176"; // Yellow for caution
    return "#81C784"; // Green for safe
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return "Expired";
    if (days === 0) return "Expires Today";
    if (days === 1) return "Expires Tomorrow";
    return `${days} days left`;
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

  const getGradientColors = (days: number): [string, string] => {
    if (days < 0) return ["#FF5252", "#D32F2F"];
    if (days <= 3) return ["#FF7043", "#F4511E"];
    if (days <= 7) return ["#FFB74D", "#FF9800"];
    if (days <= 14) return ["#FFF176", "#FDD835"];
    return ["#81C784", "#66BB6A"];
  };

  useEffect(() => {
    fetchExpiryDates();
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchExpiryDates(true);
  }, []);

  const handleDateSelect = (day: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDate(day.dateString);
    updateMarkedDates(expiryDates);
  };

  const filteredDates = expiryDates.filter(
    (date) => date.date === selectedDate
  );

  const upcomingExpiries = expiryDates
    .filter((date) => date.daysUntilExpiry >= 0 && date.daysUntilExpiry <= 7)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const expiredItems = expiryDates.filter((date) => date.daysUntilExpiry < 0);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading your calendar...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Surface style={styles.headerSurface} elevation={0}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Food Calendar
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Track your food expiration dates
          </Text>
        </Surface>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Calendar Card */}
          <Card style={styles.calendarCard} elevation={5}>
            <Card.Content style={styles.calendarContent}>
              <RNCalendar
                onDayPress={handleDateSelect}
                markedDates={markedDates}
                theme={{
                  backgroundColor: "transparent",
                  calendarBackground: "transparent",
                  textSectionTitleColor: theme.colors.primary,
                  selectedDayBackgroundColor: theme.colors.primary,
                  selectedDayTextColor: "#ffffff",
                  todayTextColor: theme.colors.primary,
                  dayTextColor: "#2d4150",
                  textDisabledColor: "#d9e1e8",
                  dotColor: theme.colors.primary,
                  selectedDotColor: "#ffffff",
                  arrowColor: theme.colors.primary,
                  disabledArrowColor: "#d9e1e8",
                  monthTextColor: theme.colors.primary,
                  indicatorColor: theme.colors.primary,
                  textDayFontFamily: "System",
                  textMonthFontFamily: "System",
                  textDayHeaderFontFamily: "System",
                  textDayFontWeight: "500",
                  textMonthFontWeight: "bold",
                  textDayHeaderFontWeight: "600",
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                }}
                style={styles.calendar}
              />
            </Card.Content>
          </Card>

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <Surface
              style={[styles.statCard, { backgroundColor: "#E8F5E8" }]}
              elevation={4}
            >
              <IconButton icon="check-circle" iconColor="#4CAF50" size={24} />
              <Text variant="bodySmall" style={styles.statLabel}>
                Safe Items
              </Text>
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: "#4CAF50" }]}
              >
                {expiryDates.filter((d) => d.daysUntilExpiry > 7).length}
              </Text>
            </Surface>

            <Surface
              style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}
              elevation={4}
            >
              <IconButton icon="alert" iconColor="#FF9800" size={24} />
              <Text variant="bodySmall" style={styles.statLabel}>
                Warning
              </Text>
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: "#FF9800" }]}
              >
                {upcomingExpiries.length}
              </Text>
            </Surface>

            <Surface
              style={[styles.statCard, { backgroundColor: "#FFEBEE" }]}
              elevation={4}
            >
              <IconButton icon="close-circle" iconColor="#F44336" size={24} />
              <Text variant="bodySmall" style={styles.statLabel}>
                Expired
              </Text>
              <Text
                variant="titleLarge"
                style={[styles.statValue, { color: "#F44336" }]}
              >
                {expiredItems.length}
              </Text>
            </Surface>
          </View>

          {/* Upcoming Expiries */}
          {upcomingExpiries.length > 0 && (
            <Card style={styles.sectionCard} elevation={5}>
              <Card.Content style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                  <IconButton
                    icon="clock-alert"
                    iconColor={theme.colors.primary}
                    size={28}
                  />
                  <Text variant="titleLarge" style={styles.sectionTitle}>
                    Expiring Soon
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {upcomingExpiries.map((item, index) => {
                    const color = getExpiryColor(item.daysUntilExpiry);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          router.push(`/product-detail?barcode=${item.id}`);
                        }}
                        style={[
                          styles.upcomingItem,
                          { marginLeft: index === 0 ? 0 : 12 },
                        ]}
                      >
                        <View
                          style={[
                            styles.upcomingContent,
                            { backgroundColor: color },
                          ]}
                        >
                          <IconButton
                            icon={getCategoryIcon(item.category)}
                            iconColor="#fff"
                            size={32}
                            style={styles.upcomingIcon}
                          />
                          <Text
                            variant="bodyMedium"
                            style={styles.upcomingName}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          <View style={styles.upcomingBadge}>
                            <Text
                              variant="bodySmall"
                              style={styles.upcomingDays}
                            >
                              {getExpiryStatus(item.daysUntilExpiry)}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Card.Content>
            </Card>
          )}

          {/* Selected Date Items */}
          {filteredDates.length > 0 && (
            <Card style={styles.sectionCard} elevation={5}>
              <Card.Content style={styles.sectionContent}>
                <View style={styles.sectionHeader}>
                  <IconButton
                    icon="calendar-today"
                    iconColor={theme.colors.primary}
                    size={28}
                  />
                  <Text variant="titleLarge" style={styles.sectionTitle}>
                    {new Date(selectedDate).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>

                {filteredDates.map((item) => {
                  const color = getExpiryColor(item.daysUntilExpiry);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/product-detail?barcode=${item.id}`);
                      }}
                      style={styles.dateItem}
                    >
                      <Surface style={styles.dateItemSurface} elevation={2}>
                        <View
                          style={[
                            styles.dateItemContent,
                            { borderLeftColor: color, borderLeftWidth: 4 },
                          ]}
                        >
                          <View style={styles.dateItemLeft}>
                            <IconButton
                              icon={getCategoryIcon(item.category)}
                              iconColor={color}
                              size={24}
                              style={styles.dateItemIcon}
                            />
                            <View style={styles.dateItemInfo}>
                              <Text
                                variant="bodyLarge"
                                style={styles.dateItemName}
                              >
                                {item.name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={styles.dateItemCategory}
                              >
                                {item.category} • Qty: {item.quantity}
                              </Text>
                            </View>
                          </View>
                          <Chip
                            style={[
                              styles.dateItemChip,
                              { backgroundColor: color },
                            ]}
                            textStyle={styles.dateItemChipText}
                          >
                            {getExpiryStatus(item.daysUntilExpiry)}
                          </Chip>
                        </View>
                      </Surface>
                    </TouchableOpacity>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {/* Empty State */}
          {expiryDates.length === 0 && (
            <Card style={styles.emptyCard} elevation={4}>
              <Card.Content style={styles.emptyContent}>
                <IconButton
                  icon="calendar-blank"
                  iconColor={theme.colors.outline}
                  size={64}
                />
                <Text variant="headlineSmall" style={styles.emptyTitle}>
                  No Items Yet
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtitle}>
                  Start scanning products to track their expiry dates
                </Text>
              </Card.Content>
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerSurface: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  headerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  calendarCard: {
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  calendarContent: {
    padding: 8,
  },
  calendar: {
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minHeight: 100,
    justifyContent: "center",
  },
  statLabel: {
    color: "#666",
    marginTop: 4,
    fontWeight: "500",
  },
  statValue: {
    fontWeight: "bold",
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  sectionContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#1a1a1a",
    marginLeft: 8,
  },
  horizontalScroll: {
    paddingVertical: 8,
  },
  upcomingItem: {
    width: 160,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  upcomingContent: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
  },
  upcomingIcon: {
    margin: 0,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  upcomingName: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    flex: 1,
    marginVertical: 8,
  },
  upcomingBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upcomingDays: {
    color: "#333",
    fontWeight: "600",
    fontSize: 12,
  },
  dateItem: {
    marginBottom: 12,
  },
  dateItemSurface: {
    borderRadius: 16,
    overflow: "hidden",
  },
  dateItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 15,
  },
  dateItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateItemIcon: {
    margin: 0,
    marginRight: 12,
  },
  dateItemInfo: {
    flex: 1,
  },
  dateItemName: {
    fontWeight: "600",
    color: "#1a1a1a",
  },
  dateItemCategory: {
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  dateItemChip: {
    borderRadius: 20,
  },
  dateItemChipText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: 20,
    marginVertical: 40,
  },
  emptyContent: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
});
