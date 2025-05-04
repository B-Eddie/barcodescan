import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
  deleteDoc,
  doc,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  IconButton,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

interface ExpiryItem {
  id: string;
  name: string;
  expiryDate: string;
  daysUntilExpiry: number;
  imageUrl?: string;
  category?: string;
  quantity?: number;
}

type FilterOption = "all" | "expiring-soon" | "expired" | "fresh";
type CategoryIcon = "cheese" | "food-steak" | "fruit-watermelon" | "carrot" | "bread-slice" | "food-variant" | "snowflake" | "cookie" | "food";

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [upcomingItems, setUpcomingItems] = useState<ExpiryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fabVisible] = useState(new Animated.Value(1));

  useEffect(() => {
    fetchUpcomingItems();
  }, []);
  
  useEffect(() => {
    // Apply filtering and searching
    let result = [...upcomingItems];
    
    // Apply category/status filter
    if (filterOption === "expiring-soon") {
      result = result.filter(item => item.daysUntilExpiry <= 7 && item.daysUntilExpiry > 0);
    } else if (filterOption === "expired") {
      result = result.filter(item => item.daysUntilExpiry <= 0);
    } else if (filterOption === "fresh") {
      result = result.filter(item => item.daysUntilExpiry > 7);
    }
    
    // Apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item => 
          item.name.toLowerCase().includes(query) || 
          item.id.toLowerCase().includes(query) ||
          (item.category && item.category.toLowerCase().includes(query))
      );
    }
    
    setFilteredItems(result);
  }, [upcomingItems, filterOption, searchQuery]);

  const fetchUpcomingItems = async () => {
    try {
      setLoading(true);
      const db = getFirestore(firebaseApp);
      const productsRef = collection(db, "products");

      // Get current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Include items that expired up to 7 days ago
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Add a timeout to the Firebase query
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firebase query timeout')), 10000)
      );

      // Query all products with limit for better performance
      const q = query(
        productsRef,
        where("expiryDate", ">=", sevenDaysAgo.toISOString().split("T")[0]),
        orderBy("expiryDate", "asc")
      );

      // Race the query with a timeout
      const querySnapshot = await Promise.race([
        getDocs(q),
        timeoutPromise
      ]) as QuerySnapshot<DocumentData>;

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
          category: data.category,
          quantity: data.quantity,
        });
      });

      setUpcomingItems(products);
    } catch (error) {
      console.error("Error fetching upcoming items:", error);
      
      // More specific error handling
      if (error instanceof Error && error.message === 'Firebase query timeout') {
        Alert.alert(
          "Connection Issue", 
          "The database request timed out. Please check your internet connection and try again."
        );
      } else {
        Alert.alert("Error", "Failed to load your food items");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUpcomingItems();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getExpiryColor = (days: number) => {
    if (days <= 0) return theme.colors.error;
    if (days <= 3) return theme.colors.tertiary;
    if (days <= 7) return "#FF9800"; // Orange
    return theme.colors.primary;
  };
  
  const getExpiryStatus = (days: number): string => {
    if (days < 0) return `Expired ${Math.abs(days)} days ago`;
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `${days} days left`;
  };
  
  const getCategoryIcon = (category?: string): CategoryIcon => {
    switch (category?.toLowerCase()) {
      case "dairy": return "cheese";
      case "meat": return "food-steak";
      case "fruits": return "fruit-watermelon";
      case "vegetables": return "carrot";
      case "bakery": return "bread-slice";
      case "canned": return "food-variant";
      case "frozen": return "snowflake";
      case "snacks": return "cookie";
      default: return "food";
    }
  };
  
  const handleDeleteItem = (id: string, name: string) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const db = getFirestore(firebaseApp);
              await deleteDoc(doc(db, "products", id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Update the local state
              setUpcomingItems(prevItems => prevItems.filter(item => item.id !== id));
              
              // No need to update filteredItems as it will be updated via the useEffect
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item. Please try again.");
            }
          }
        }
      ]
    );
  };
  
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    // Hide FAB when scrolling down, show when scrolling up
    if (scrollY > 20) {
      Animated.spring(fabVisible, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(fabVisible, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your food items...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
          onClearIconPress={() => setSearchQuery("")}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <Chip
            selected={filterOption === "all"}
            onPress={() => {
              setFilterOption("all");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.filterChip}
            icon="food-apple"
          >
            All
          </Chip>
          <Chip
            selected={filterOption === "expiring-soon"}
            onPress={() => {
              setFilterOption("expiring-soon");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.filterChip}
            icon="timer-sand"
          >
            Expiring Soon
          </Chip>
          <Chip
            selected={filterOption === "expired"}
            onPress={() => {
              setFilterOption("expired");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.filterChip}
            icon="alert-circle"
          >
            Expired
          </Chip>
          <Chip
            selected={filterOption === "fresh"}
            onPress={() => {
              setFilterOption("fresh");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.filterChip}
            icon="check-circle"
          >
            Fresh
          </Chip>
        </ScrollView>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            {searchQuery || filterOption !== "all" ? (
              <>
                <MaterialCommunityIcons
                  name="text-search"
                  size={64}
                  color={theme.colors.outline}
                />
                <Text style={styles.emptyStateText}>No matching items found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try changing your search or filters
                </Text>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setSearchQuery("");
                    setFilterOption("all");
                  }}
                  style={styles.resetButton}
                >
                  Reset Filters
                </Button>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="fridge-outline"
                  size={64}
                  color={theme.colors.outline}
                />
                <Text style={styles.emptyStateText}>No upcoming expiries</Text>
                <Text style={styles.emptyStateSubtext}>
                  Scan a product and add an expiry date to see it here
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => router.push("/scan")}
                  style={styles.scanButton}
                  icon="barcode-scan"
                >
                  Scan Product
                </Button>
              </>
            )}
          </View>
        ) : (
          <>
            {filteredItems.map((item) => (
              <Card key={item.id} style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.productInfo}>
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.productImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.productImage, styles.productImagePlaceholder]}>
                          <MaterialCommunityIcons
                            name={getCategoryIcon(item.category)}
                            size={20}
                            color="#fff"
                          />
                        </View>
                      )}
                      <View style={styles.productTextInfo}>
                        <Text variant="titleMedium" style={styles.productName}>{item.name}</Text>
                        <Text variant="bodySmall" style={styles.expiryDate}>
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.expiryStatus}>
                      <Text
                        variant="labelLarge"
                        style={[
                          styles.expiryStatusText,
                          { color: getExpiryColor(item.daysUntilExpiry) }
                        ]}
                      >
                        {getExpiryStatus(item.daysUntilExpiry)}
                      </Text>
                    </View>
                  </View>
                  
                  <Divider style={styles.divider} />
                  
                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardMeta}>
                      {item.category && (
                        <Chip 
                          icon={getCategoryIcon(item.category)}
                          style={styles.metaChip}
                          compact
                        >
                          {item.category}
                        </Chip>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <Chip 
                          icon="numeric"
                          style={styles.metaChip}
                          compact
                        >
                          {item.quantity}x
                        </Chip>
                      )}
                    </View>
                    <View style={styles.cardActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => {
                          router.push({
                            pathname: "/product",
                            params: { barcode: item.id }
                          });
                        }}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={theme.colors.error}
                        onPress={() => handleDeleteItem(item.id, item.name)}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
            
            <View style={styles.itemCountContainer}>
              <Text style={styles.itemCountText}>
                Showing {filteredItems.length} of {upcomingItems.length} items
              </Text>
            </View>
          </>
        )}
      </ScrollView>
      
      <Animated.View 
        style={[
          styles.fabContainer, 
          { transform: [{ scale: fabVisible }], opacity: fabVisible }
        ]}
      >
        <FAB.Group
          visible={true}
          open={false}
          icon="plus"
          actions={[
            {
              icon: 'barcode-scan',
              label: 'Scan Product',
              onPress: () => router.push("/scan"),
            },
            {
              icon: 'receipt',
              label: 'Scan Receipt',
              onPress: () => router.push("/receipt-scan"),
            },
          ]}
          onStateChange={() => {}}
          onPress={() => router.push("/scan")}
        />
      </Animated.View>
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
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  searchBar: {
    elevation: 0,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  filterContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  filterScrollContent: {
    paddingHorizontal: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    padding: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  productTextInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "500",
  },
  expiryDate: {
    color: "#666",
  },
  expiryStatus: {
    paddingHorizontal: 8,
  },
  expiryStatusText: {
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaChip: {
    marginRight: 8,
    height: 28,
  },
  cardActions: {
    flexDirection: "row",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  scanButton: {
    minWidth: 150,
  },
  resetButton: {
    marginTop: 16,
  },
  fabContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  itemCountContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  itemCountText: {
    color: "#999",
    fontSize: 12,
  },
});
