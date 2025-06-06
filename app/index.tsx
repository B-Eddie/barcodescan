import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { get, ref, remove } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Card, Text } from "react-native-paper";
import AppLayout from "../components/AppLayout";
import {
  Colors,
  CommonStyles,
  SafeArea,
  Shadows,
  Spacing,
} from "../constants/designSystem";
import { auth, database } from "../firebaseConfig";

const { width } = Dimensions.get("window");

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

interface QuickStat {
  icon: string;
  label: string;
  value: number;
  color: string;
  gradient: string[];
}

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerScale = useRef(new Animated.Value(0.95)).current;

  useFocusEffect(
    useCallback(() => {
      loadFoodItems();
    }, [])
  );

  useEffect(() => {
    if (!loading) {
      // Animate in after data loads
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(headerScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [loading]);

  const loadFoodItems = async () => {
    try {
      setLoading(true);
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

      const foodItemsList: FoodItem[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          foodItemsList.push({
            id: childSnapshot.key || "",
            name: data.name,
            purchaseDate: data.purchaseDate,
            estimatedExpiryDate: data.expiryDate,
            confidence: data.confidence,
            category: data.category,
            quantity: data.quantity,
            daysUntilExpiry: Math.ceil(
              (new Date(data.expiryDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            ),
            status: data.status,
          });
        });
      }

      // Calculate status for each item
      const itemsWithStatus = foodItemsList.map((item) => {
        let status: "fresh" | "expiring_soon" | "expired";
        if (item.daysUntilExpiry < 0) {
          status = "expired";
        } else if (item.daysUntilExpiry <= 3) {
          status = "expiring_soon";
        } else {
          status = "fresh";
        }

        return {
          ...item,
          status,
        };
      });

      setFoodItems(itemsWithStatus);
    } catch (error) {
      console.error("Error loading food items:", error);
      Alert.alert("Error", "Failed to load food items");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFoodItems();
    setRefreshing(false);
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

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to remove this item from your pantry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const currentUser = auth.currentUser;
              if (!currentUser?.email) {
                Alert.alert("Error", "You must be logged in to delete items");
                return;
              }

              const encodedEmail = encodeURIComponent(
                currentUser.email.replace(/\./g, ",")
              );

              const itemRef = ref(
                database,
                `users/${encodedEmail}/products/${itemId}`
              );
              await remove(itemRef);

              setFoodItems((prev) => prev.filter((item) => item.id !== itemId));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handleMarkAsConsumed = async (itemId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to mark items as consumed");
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );

      const itemRef = ref(database, `users/${encodedEmail}/products/${itemId}`);
      await remove(itemRef);

      setFoodItems((prev) => prev.filter((item) => item.id !== itemId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Error marking item as consumed:", error);
      Alert.alert("Error", "Failed to mark item as consumed");
    }
  };

  // Calculate stats
  const totalItems = foodItems.length;
  const expiringSoonCount = foodItems.filter(
    (item) => item.status === "expiring_soon"
  ).length;
  const expiredCount = foodItems.filter(
    (item) => item.status === "expired"
  ).length;
  const freshCount = foodItems.filter((item) => item.status === "fresh").length;

  const quickStats: QuickStat[] = [
    {
      icon: "food",
      label: "Total Items",
      value: totalItems,
      color: Colors.primary500,
      gradient: [Colors.primary400, Colors.primary600],
    },
    {
      icon: "check-circle",
      label: "Fresh",
      value: freshCount,
      color: Colors.success,
      gradient: ["#66BB6A", "#4CAF50"],
    },
    {
      icon: "clock-alert",
      label: "Expiring",
      value: expiringSoonCount,
      color: Colors.warning,
      gradient: ["#FFB74D", "#FF9800"],
    },
    {
      icon: "close-circle",
      label: "Expired",
      value: expiredCount,
      color: Colors.error,
      gradient: ["#EF5350", "#F44336"],
    },
  ];

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesFilter =
      selectedFilter === "all" || item.status === selectedFilter;

    return matchesSearch && matchesCategory && matchesFilter;
  });

  const renderQuickStat = ({
    item,
    index,
  }: {
    item: QuickStat;
    index: number;
  }) => (
    <Animated.View
      style={[
        styles.statCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={item.gradient}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statContent}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={Colors.white}
          />
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

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
                translateX: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push(`/product-detail?barcode=${item.id}`)}
          activeOpacity={0.7}
        >
          <Card style={styles.foodCard}>
            <Card.Content style={styles.foodCardContent}>
              <View style={styles.foodItemHeader}>
                <View style={styles.foodItemInfo}>
                  <View style={styles.iconContainer}>
                    <MaterialCommunityIcons
                      name={getCategoryIcon(item.category) as any}
                      size={20}
                      color={Colors.primary500}
                    />
                  </View>
                  <View style={styles.foodItemDetails}>
                    <Text style={styles.foodItemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.foodItemMeta}>
                      {item.category} • Qty: {item.quantity}
                    </Text>
                  </View>
                </View>

                <View style={styles.foodItemActions}>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(item.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.daysText,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {item.daysUntilExpiry >= 0
                        ? `${item.daysUntilExpiry}d`
                        : `${Math.abs(item.daysUntilExpiry)}d ago`}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => handleMarkAsConsumed(item.id)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: Colors.success },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={Colors.white}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteItem(item.id)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: Colors.error },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="delete"
                        size={16}
                        color={Colors.white}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <View style={[CommonStyles.container, CommonStyles.centerContent]}>
          <ActivityIndicator size="large" color={Colors.primary500} />
          <Text style={styles.loadingText}>Loading your pantry...</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={[Colors.primary500, Colors.primary400]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: headerScale }],
              },
            ]}
          >
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back!</Text>
              <Text style={styles.headerTitle}>My Smart Pantry</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/scan")}
            >
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={Colors.white}
              />
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <FlatList
            data={quickStats}
            renderItem={renderQuickStat}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          />
        </View>

        {/* Recent Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Items</Text>
            <TouchableOpacity onPress={() => router.push("/calendar")}>
              <Text style={styles.viewAllText}>View Calendar</Text>
            </TouchableOpacity>
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="basket-outline"
                size={64}
                color={Colors.gray400}
              />
              <Text style={styles.emptyTitle}>Your pantry is empty</Text>
              <Text style={styles.emptySubtitle}>
                Start by scanning some products!
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => router.push("/scan")}
              >
                <Text style={styles.scanButtonText}>Scan Items</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredItems.slice(0, 10)} // Show only first 10 items
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.itemsList}
            />
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
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
    paddingBottom: Spacing.xl,
    paddingHorizontal: SafeArea.horizontal,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
  },

  welcomeText: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.white,
  },

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  statsSection: {
    marginTop: -Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  statsContainer: {
    paddingHorizontal: SafeArea.horizontal,
    gap: Spacing.md,
  },

  statCard: {
    width: width * 0.22,
    height: 90,
    borderRadius: 16,
    ...Shadows.md,
  },

  statGradient: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },

  statContent: {
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: Spacing.xs,
  },

  statLabel: {
    fontSize: 11,
    color: Colors.white,
    opacity: 0.9,
    textAlign: "center",
    marginTop: 2,
  },

  itemsSection: {
    paddingHorizontal: SafeArea.horizontal,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.gray900,
  },

  viewAllText: {
    fontSize: 16,
    color: Colors.primary500,
    fontWeight: "500",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.gray700,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  emptySubtitle: {
    fontSize: 16,
    color: Colors.gray500,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },

  scanButton: {
    backgroundColor: Colors.primary500,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },

  scanButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  itemsList: {
    gap: Spacing.md,
  },

  foodCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.sm,
    marginBottom: Spacing.sm,
  },

  foodCardContent: {
    padding: Spacing.lg,
  },

  foodItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  foodItemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  foodItemDetails: {
    flex: 1,
  },

  foodItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray900,
    marginBottom: 2,
  },

  foodItemMeta: {
    fontSize: 13,
    color: Colors.gray600,
  },

  foodItemActions: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  daysText: {
    fontSize: 14,
    fontWeight: "600",
  },

  actionButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },

  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    ...CommonStyles.body,
    marginTop: Spacing.md,
    textAlign: "center",
  },
});
