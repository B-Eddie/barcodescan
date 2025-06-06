import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

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

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Categories for filtering
  const categories = [
    { label: "All", value: "all" },
    { label: "Dairy", value: "dairy" },
    { label: "Meat", value: "meat" },
    { label: "Produce", value: "produce" },
    { label: "Bakery", value: "bakery" },
    { label: "Snacks", value: "snacks" },
    { label: "Other", value: "other" },
  ];

  // Filter options
  const filterOptions = [
    { label: "All Items", value: "all" },
    { label: "Fresh", value: "fresh" },
    { label: "Expiring Soon", value: "expiring_soon" },
    { label: "Expired", value: "expired" },
  ];

  useEffect(() => {
    loadFoodItems();
  }, []);

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

      // Calculate days until expiry and status for each item
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
    const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
      {
        dairy: "cheese",
        meat: "food-steak",
        produce: "fruit-watermelon",
        bakery: "bread-slice",
        snacks: "cookie",
        other: "food",
      };
    return icons[category] || icons.other;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fresh":
        return "#4CAF50";
      case "expiring_soon":
        return "#FF9800";
      case "expired":
        return "#F44336";
      default:
        return theme.colors.primary;
    }
  };

  const getStatusText = (daysUntilExpiry: number, status: string) => {
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

  const expiringSoonCount = foodItems.filter(
    (item) => item.status === "expiring_soon"
  ).length;
  const expiredCount = foodItems.filter(
    (item) => item.status === "expired"
  ).length;

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

              // Delete from Firebase
              const { remove } = await import("firebase/database");
              const itemRef = ref(
                database,
                `users/${encodedEmail}/products/${itemId}`
              );
              await remove(itemRef);

              // Update local state
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

      // Delete from Firebase (marking as consumed = removing from pantry)
      const { remove } = await import("firebase/database");
      const itemRef = ref(database, `users/${encodedEmail}/products/${itemId}`);
      await remove(itemRef);

      // Update local state
      setFoodItems((prev) => prev.filter((item) => item.id !== itemId));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Error marking item as consumed:", error);
      Alert.alert("Error", "Failed to mark item as consumed");
    }
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <Card style={styles.itemCard}>
      <Card.Content style={styles.compactContent}>
        <View style={styles.itemRow}>
          <View style={styles.itemLeft}>
            <MaterialCommunityIcons
              name={getCategoryIcon(item.category)}
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.itemInfo}>
              <Text
                variant="bodyLarge"
                style={styles.itemName}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.itemMeta}>
                {item.category} • Qty: {item.quantity}
              </Text>
            </View>
          </View>

          <View style={styles.itemRight}>
            <View style={styles.statusContainer}>
              <Text
                variant="bodySmall"
                style={[
                  styles.statusText,
                  { color: getStatusColor(item.status) },
                ]}
                numberOfLines={1}
              >
                {item.daysUntilExpiry >= 0
                  ? `${item.daysUntilExpiry}d`
                  : `${Math.abs(item.daysUntilExpiry)}d ago`}
              </Text>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(item.status) },
                ]}
              />
            </View>

            <View style={styles.actionButtons}>
              <IconButton
                icon="check-circle"
                size={18}
                iconColor="#4CAF50"
                onPress={() => handleMarkAsConsumed(item.id)}
                style={styles.compactButton}
              />
              <IconButton
                icon="delete"
                size={18}
                iconColor="#F44336"
                onPress={() => handleDeleteItem(item.id)}
                style={styles.compactButton}
              />
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your food items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          My Pantry
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          {foodItems.length} items tracked
        </Text>

        {/* Alert Cards */}
        {(expiringSoonCount > 0 || expiredCount > 0) && (
          <View style={styles.alertsContainer}>
            {expiringSoonCount > 0 && (
              <Card style={[styles.alertCard, styles.expiringSoonCard]}>
                <Card.Content style={styles.alertContent}>
                  <MaterialCommunityIcons
                    name="clock-alert"
                    size={24}
                    color="#FF9800"
                  />
                  <Text variant="bodyMedium" style={styles.alertText}>
                    {expiringSoonCount} item{expiringSoonCount > 1 ? "s" : ""}{" "}
                    expiring soon
                  </Text>
                </Card.Content>
              </Card>
            )}

            {expiredCount > 0 && (
              <Card style={[styles.alertCard, styles.expiredCard]}>
                <Card.Content style={styles.alertContent}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={24}
                    color="#F44336"
                  />
                  <Text variant="bodyMedium" style={styles.alertText}>
                    {expiredCount} item{expiredCount > 1 ? "s" : ""} expired
                  </Text>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Search Bar */}
        <TextInput
          placeholder="Search your pantry..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((category) => (
            <Chip
              key={category.value}
              mode={selectedCategory === category.value ? "flat" : "outlined"}
              selected={selectedCategory === category.value}
              onPress={() => setSelectedCategory(category.value)}
              style={styles.categoryChip}
            >
              {category.label}
            </Chip>
          ))}
        </ScrollView>

        {/* Status Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filterOptions.map((filter) => (
            <Chip
              key={filter.value}
              mode={selectedFilter === filter.value ? "flat" : "outlined"}
              selected={selectedFilter === filter.value}
              onPress={() => setSelectedFilter(filter.value)}
              style={styles.filterChip}
            >
              {filter.label}
            </Chip>
          ))}
        </ScrollView>
      </Surface>

      {/* Food Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="fridge-outline"
              size={64}
              color={theme.colors.outline}
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No items found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Scan your first receipt to start tracking food expiry dates
            </Text>
            <Button
              mode="contained"
              onPress={() => router.push("/scan")}
              style={styles.emptyButton}
              icon="camera"
            >
              Scan Receipt
            </Button>
          </View>
        }
      />

      {/* Floating Action Button */}
      <Surface style={styles.fab} elevation={4}>
        <IconButton
          icon="camera"
          size={28}
          iconColor="#fff"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/scan");
          }}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#666",
    marginBottom: 16,
  },
  alertsContainer: {
    marginBottom: 16,
  },
  alertCard: {
    marginBottom: 8,
  },
  expiringSoonCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  expiredCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  alertContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  alertText: {
    marginLeft: 12,
    fontWeight: "500",
  },
  searchBar: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
    fontSize: 16,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemInfo: {
    marginLeft: 12,
  },
  itemName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  itemMeta: {
    color: "#666",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontWeight: "500",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actionButtons: {
    flexDirection: "row",
  },
  compactContent: {
    padding: 12,
  },
  compactButton: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
});
