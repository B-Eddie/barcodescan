import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { get, ref } from "firebase/database";
import { useCallback, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, StyleSheet, View } from "react-native";
import Calendar from "react-native-calendars/src/calendar";
import { ActivityIndicator, Card, Chip, Text } from "react-native-paper";
import AppLayout from "../components/AppLayout";
import {
  Colors,
  CommonStyles,
  SafeArea,
  Shadows,
  Spacing,
} from "../constants/designSystem";
import { auth, database } from "../firebaseConfig";

const { width, height } = Dimensions.get("window");

interface FoodItem {
  id: string;
  name: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  confidence: number;
  category: string;
  quantity: number;
  daysUntilExpiry: number;
  status: "fresh" | "expiring_soon" | "expired";
}

interface MarkedDates {
  [key: string]: {
    dots?: Array<{ key: string; color: string }>;
    marked?: boolean;
    selectedDotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [itemsForSelectedDate, setItemsForSelectedDate] = useState<FoodItem[]>(
    []
  );

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const calendarScale = useRef(new Animated.Value(0.95)).current;

  useFocusEffect(
    useCallback(() => {
      loadFoodItems();
    }, [])
  );

  const loadFoodItems = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productsRef = ref(database, `users/${encodedEmail}/products`);
      const snapshot = await get(productsRef);

      const foodItemsList: FoodItem[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          const daysUntilExpiry = Math.ceil(
            (new Date(data.expiryDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );

          let status: "fresh" | "expiring_soon" | "expired";
          if (daysUntilExpiry < 0) {
            status = "expired";
          } else if (daysUntilExpiry <= 3) {
            status = "expiring_soon";
          } else {
            status = "fresh";
          }

          foodItemsList.push({
            id: childSnapshot.key || "",
            name: data.name,
            purchaseDate: data.purchaseDate,
            estimatedExpiryDate: data.expiryDate,
            confidence: data.confidence,
            category: data.category,
            quantity: data.quantity,
            daysUntilExpiry,
            status,
          });
        });
      }

      setFoodItems(foodItemsList);
      createMarkedDates(foodItemsList);
      updateItemsForDate(selectedDate, foodItemsList);

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(calendarScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } catch (error) {
      console.error("Error loading food items:", error);
    } finally {
      setLoading(false);
    }
  };

  const createMarkedDates = (items: FoodItem[]) => {
    const marked: MarkedDates = {};

    // Group items by expiry date
    const itemsByDate = items.reduce((acc, item) => {
      const date = item.estimatedExpiryDate;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, FoodItem[]>);

    // Create marked dates with dots
    Object.keys(itemsByDate).forEach((date) => {
      const dateItems = itemsByDate[date];
      const dots = [];

      // Count items by status
      const freshCount = dateItems.filter(
        (item) => item.status === "fresh"
      ).length;
      const expiringSoonCount = dateItems.filter(
        (item) => item.status === "expiring_soon"
      ).length;
      const expiredCount = dateItems.filter(
        (item) => item.status === "expired"
      ).length;

      // Add dots based on status (max 3 dots)
      if (freshCount > 0) {
        dots.push({ key: "fresh", color: Colors.success });
      }
      if (expiringSoonCount > 0) {
        dots.push({ key: "expiring", color: Colors.warning });
      }
      if (expiredCount > 0) {
        dots.push({ key: "expired", color: Colors.error });
      }

      marked[date] = {
        dots: dots.slice(0, 3), // Maximum 3 dots
        marked: true,
      };
    });

    // Mark selected date
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: Colors.primary500,
    };

    setMarkedDates(marked);
  };

  const updateItemsForDate = (date: string, items: FoodItem[] = foodItems) => {
    const itemsForDate = items.filter(
      (item) => item.estimatedExpiryDate === date
    );
    setItemsForSelectedDate(itemsForDate);
  };

  const handleDatePress = (day: any) => {
    const date = day.dateString;
    setSelectedDate(date);
    updateItemsForDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update marked dates to show new selection
    const newMarkedDates = { ...markedDates };

    // Remove previous selection
    Object.keys(newMarkedDates).forEach((key) => {
      if (newMarkedDates[key].selected) {
        delete newMarkedDates[key].selected;
        delete newMarkedDates[key].selectedColor;
      }
    });

    // Add new selection
    newMarkedDates[date] = {
      ...newMarkedDates[date],
      selected: true,
      selectedColor: Colors.primary500,
    };

    setMarkedDates(newMarkedDates);

    // Animate items update
    Animated.sequence([
      Animated.timing(slideUpAnim, {
        toValue: 20,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      dairy: "cheese",
      meat: "food-steak",
      produce: "fruit-watermelon",
      bakery: "bread-slice",
      snacks: "cookie",
      beverages: "cup",
      canned: "food-variant",
      frozen: "snowflake",
      other: "food",
    };
    return icons[category] || icons.other;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fresh":
        return Colors.success;
      case "expiring_soon":
        return Colors.warning;
      case "expired":
        return Colors.error;
      default:
        return Colors.primary500;
    }
  };

  const getStatusText = (status: string, daysUntilExpiry: number) => {
    if (status === "expired") {
      return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (status === "expiring_soon") {
      return daysUntilExpiry === 0
        ? "Expires today"
        : `Expires in ${daysUntilExpiry} days`;
    } else {
      return `Fresh for ${daysUntilExpiry} days`;
    }
  };

  const renderFoodItem = ({
    item,
    index,
  }: {
    item: FoodItem;
    index: number;
  }) => {
    const animatedValue = new Animated.Value(0);

    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        style={[
          {
            opacity: animatedValue,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Card style={styles.itemCard}>
          <Card.Content style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${getStatusColor(item.status)}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={getCategoryIcon(item.category) as any}
                    size={20}
                    color={getStatusColor(item.status)}
                  />
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemCategory}>
                    {item.category} • Qty: {item.quantity}
                  </Text>
                </View>
              </View>

              <View style={styles.statusInfo}>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    { backgroundColor: `${getStatusColor(item.status)}20` },
                  ]}
                  textStyle={[
                    styles.statusText,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.status.replace("_", " ")}
                </Chip>
              </View>
            </View>

            <Text style={styles.statusDescription}>
              {getStatusText(item.status, item.daysUntilExpiry)}
            </Text>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const formatSelectedDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Today";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Tomorrow";
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <View style={[CommonStyles.container, CommonStyles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.primary500} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ scale: calendarScale }],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Expiry Calendar</Text>
          <Text style={styles.headerSubtitle}>
            Track when your items expire
          </Text>
        </Animated.View>

        {/* Calendar Section */}
        <Animated.View
          style={[
            styles.calendarSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: calendarScale }],
            },
          ]}
        >
          <Card style={styles.calendarCard}>
            <Calendar
              current={selectedDate}
              onDayPress={handleDatePress}
              markingType="multi-dot"
              markedDates={markedDates}
              theme={{
                backgroundColor: Colors.surface,
                calendarBackground: Colors.surface,
                textSectionTitleColor: Colors.gray600,
                selectedDayBackgroundColor: Colors.primary500,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.primary500,
                dayTextColor: Colors.gray900,
                textDisabledColor: Colors.gray300,
                dotColor: Colors.primary500,
                selectedDotColor: Colors.white,
                arrowColor: Colors.primary500,
                monthTextColor: Colors.gray900,
                indicatorColor: Colors.primary500,
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              style={styles.calendar}
            />
          </Card>
        </Animated.View>

        {/* Legend */}
        <Animated.View
          style={[
            styles.legend,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.success }]}
            />
            <Text style={styles.legendText}>Fresh</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.warning }]}
            />
            <Text style={styles.legendText}>Expiring Soon</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Colors.error }]}
            />
            <Text style={styles.legendText}>Expired</Text>
          </View>
        </Animated.View>

        {/* Selected Date Items */}
        <Animated.View
          style={[
            styles.itemsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {formatSelectedDate(selectedDate)}
            </Text>
            <View style={styles.itemCount}>
              <Text style={styles.itemCountText}>
                {itemsForSelectedDate.length} items
              </Text>
            </View>
          </View>

          {itemsForSelectedDate.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="calendar-check"
                size={48}
                color={Colors.gray400}
              />
              <Text style={styles.emptyTitle}>No items for this date</Text>
              <Text style={styles.emptySubtitle}>
                Select a date with dots to see expiring items
              </Text>
            </View>
          ) : (
            <FlatList
              data={itemsForSelectedDate}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.itemsList}
              style={styles.flatList}
            />
          )}
        </Animated.View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: SafeArea.top + Spacing.lg,
    paddingHorizontal: SafeArea.horizontal,
    paddingBottom: Spacing.lg,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },

  headerSubtitle: {
    fontSize: 16,
    color: Colors.gray600,
  },

  calendarSection: {
    paddingHorizontal: SafeArea.horizontal,
    marginBottom: Spacing.sm,
  },

  calendarCard: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    ...Shadows.md,
  },

  calendar: {
    borderRadius: 16,
    paddingBottom: Spacing.md,
  },

  itemsSection: {
    flex: 1,
    paddingHorizontal: SafeArea.horizontal,
    marginBottom: 0, // Remove bottom margin to give more space
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.gray900,
  },

  itemCount: {
    backgroundColor: Colors.primary50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },

  itemCountText: {
    fontSize: 14,
    color: Colors.primary500,
    fontWeight: "500",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray700,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },

  emptySubtitle: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: "center",
  },

  itemsList: {
    paddingBottom: 60, // Space for absolute positioned legend
  },

  flatList: {
    flex: 1,
    maxHeight: 500, // Increased height for more visible items
  },

  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },

  itemContent: {
    padding: Spacing.lg,
  },

  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },

  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  itemDetails: {
    flex: 1,
  },

  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray900,
    marginBottom: 2,
  },

  itemCategory: {
    fontSize: 13,
    color: Colors.gray600,
    textTransform: "capitalize",
  },

  statusInfo: {
    alignItems: "flex-end",
  },

  statusChip: {
    height: 28,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },

  statusDescription: {
    fontSize: 14,
    color: Colors.gray600,
    fontStyle: "italic",
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: SafeArea.horizontal,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.gray200,
    borderBottomColor: Colors.gray200,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },

  legendText: {
    fontSize: 12,
    color: Colors.gray700,
  },

  loadingText: {
    ...CommonStyles.body,
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
