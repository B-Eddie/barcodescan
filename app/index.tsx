import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { get, ref, remove, update } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";
import { createCalendarEvent } from "../utils/calendar";

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
  const [fadeAnim] = useState(new Animated.Value(0));
  const { width } = Dimensions.get("window");
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [sortBy, setSortBy] = useState<'expiry' | 'category'>('expiry');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Category colors
  const categoryColors = {
    dairy: '#E3F2FD',
    meat: '#FFEBEE',
    fruits: '#E8F5E9',
    vegetables: '#E8F5E9',
    bakery: '#FFF3E0',
    canned: '#F3E5F5',
    frozen: '#E0F7FA',
    snacks: '#FFF8E1',
    other: '#F5F5F5'
  };

  useEffect(() => {
    fetchProducts();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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

  const getExpiryStatus = (days: number) => {
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
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

  const handleAddAllToCalendar = async () => {
    try {
      setAddingToCalendar(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to add to calendar");
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productsRef = ref(database, `users/${encodedEmail}/products`);

      // Get all products
      const snapshot = await get(productsRef);
      if (!snapshot.exists()) {
        Alert.alert("Info", "No products to add to calendar");
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Process each product
      const promises = snapshot.forEach(async (childSnapshot) => {
        const product = childSnapshot.val();
        if (!product.calendarEventId) {
          try {
            const eventId = await createCalendarEvent({
              title: `${product.name} Expires`,
              startDate: new Date(product.expiryDate),
              endDate: new Date(product.expiryDate),
              notes: `Product: ${product.name}\nCategory: ${product.category}\nQuantity: ${product.quantity}`,
              location: "Your Pantry",
            });

            if (eventId) {
              // Update product with calendar event ID
              await update(
                ref(
                  database,
                  `users/${encodedEmail}/products/${childSnapshot.key}`
                ),
                {
                  calendarEventId: eventId,
                }
              );
              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            console.error("Error adding to calendar:", error);
            failCount++;
          }
        }
      });

      await Promise.all(promises);

      // Show results
      if (successCount > 0) {
        Alert.alert(
          "Success",
          `Added ${successCount} products to calendar${
            failCount > 0 ? `\nFailed to add ${failCount} products` : ""
          }`
        );
      } else if (failCount > 0) {
        Alert.alert("Error", `Failed to add ${failCount} products to calendar`);
      } else {
        Alert.alert("Info", "All products are already in calendar");
      }
    } catch (error) {
      console.error("Error adding to calendar:", error);
      Alert.alert("Error", "Failed to add products to calendar");
    } finally {
      setAddingToCalendar(false);
    }
  };

  const getCategoryColor = (category?: string) => {
    return categoryColors[category?.toLowerCase() as keyof typeof categoryColors] || categoryColors.other;
  };

  const getSortedProducts = () => {
    let sortedProducts = [...products];
    
    if (selectedCategory) {
      sortedProducts = sortedProducts.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (sortBy === 'expiry') {
      sortedProducts.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    } else {
      sortedProducts.sort((a, b) => a.category.localeCompare(b.category));
    }

    return sortedProducts;
  };

  const renderCategorySection = (category: string, products: Product[]) => {
    if (products.length === 0) return null;

    return (
      <View key={category} style={styles.categorySection}>
        <Surface style={[styles.categoryHeader, { backgroundColor: getCategoryColor(category) }]} elevation={2}>
          <Text variant="titleMedium" style={styles.categoryTitle}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
          <Text variant="bodySmall" style={styles.categoryCount}>
            {products.length} items
          </Text>
        </Surface>
        {products.map((product) => {
          const daysUntilExpiry = Math.ceil(
            (new Date(product.expiryDate).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          );

          return (
            <Animated.View
              key={product.id}
              style={[
                styles.cardContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Swipeable renderRightActions={() => renderRightActions(product.id)}>
                <Pressable onPress={() => router.push(`/product?barcode=${product.id}`)}>
                  <Surface style={styles.card} elevation={2}>
                    <LinearGradient
                      colors={["#ffffff", getCategoryColor(product.category)]}
                      style={styles.cardContent}
                    >
                      {product.imageUrl ? (
                        <Image
                          source={{ uri: product.imageUrl }}
                          style={styles.image}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <LinearGradient
                          colors={[
                            theme.colors.primaryContainer,
                            theme.colors.primaryContainer + "80",
                          ]}
                          style={[styles.image, styles.placeholderImage]}
                        >
                          <IconButton
                            icon={getCategoryIcon(product.category)}
                            size={32}
                            iconColor={theme.colors.primary}
                          />
                        </LinearGradient>
                      )}
                      <View style={styles.textContainer}>
                        <Text
                          variant="titleMedium"
                          style={styles.productName}
                        >
                          {product.name}
                        </Text>
                        <View style={styles.detailsContainer}>
                          <Chip
                            icon={getCategoryIcon(product.category)}
                            style={[
                              styles.categoryChip,
                              {
                                backgroundColor:
                                  theme.colors.primaryContainer,
                              },
                            ]}
                            textStyle={{ color: theme.colors.primary }}
                          >
                            {product.category}
                          </Chip>
                          <Chip
                            icon="clock"
                            style={[
                              styles.expiryChip,
                              {
                                backgroundColor:
                                  getExpiryColor(daysUntilExpiry),
                              },
                            ]}
                            textStyle={{ color: "#fff" }}
                          >
                            {getExpiryStatus(daysUntilExpiry)}
                          </Chip>
                        </View>
                        <Text variant="bodySmall" style={styles.dateText}>
                          {new Date(product.expiryDate).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Surface>
                </Pressable>
              </Swipeable>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProducts(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Surface style={styles.headerCard} elevation={4}>
            <Text variant="headlineSmall" style={styles.headerTitle}>
              Your Pantry
            </Text>
            <View style={styles.sortContainer}>
              <Button
                mode={sortBy === 'expiry' ? 'contained' : 'outlined'}
                onPress={() => setSortBy('expiry')}
                style={styles.sortButton}
              >
                Sort by Expiry
              </Button>
              <Button
                mode={sortBy === 'category' ? 'contained' : 'outlined'}
                onPress={() => setSortBy('category')}
                style={styles.sortButton}
              >
                Sort by Category
              </Button>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilter}
            >
              <Chip
                selected={selectedCategory === null}
                onPress={() => setSelectedCategory(null)}
                style={styles.filterChip}
              >
                All
              </Chip>
              {Object.keys(categoryColors).map((category) => (
                <Chip
                  key={category}
                  selected={selectedCategory === category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.filterChip, { backgroundColor: getCategoryColor(category) }]}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Chip>
              ))}
            </ScrollView>
            <Button
              mode="contained"
              onPress={handleAddAllToCalendar}
              loading={addingToCalendar}
              disabled={addingToCalendar}
              icon="calendar-plus"
              style={styles.calendarButton}
            >
              Add All to Calendar
            </Button>
          </Surface>

          {products.length === 0 ? (
            <Surface style={styles.emptyCard} elevation={2}>
              <LinearGradient
                colors={["#ffffff", "#f8f9fa"]}
                style={styles.emptyContent}
              >
                <IconButton
                  icon="barcode-scan"
                  size={64}
                  iconColor={theme.colors.primary}
                  style={styles.emptyIcon}
                />
                <Text variant="headlineSmall" style={styles.emptyTitle}>
                  No Products Yet
                </Text>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Scan a barcode to start tracking your food items!
                </Text>
              </LinearGradient>
            </Surface>
          ) : (
            sortBy === 'category' ? (
              Object.keys(categoryColors).map(category => {
                const categoryProducts = getSortedProducts().filter(
                  p => p.category.toLowerCase() === category.toLowerCase()
                );
                return renderCategorySection(category, categoryProducts);
              })
            ) : (
              getSortedProducts().map(product => {
                const daysUntilExpiry = Math.ceil(
                  (new Date(product.expiryDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <Animated.View
                    key={product.id}
                    style={[
                      styles.cardContainer,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [50, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Swipeable renderRightActions={() => renderRightActions(product.id)}>
                      <Pressable onPress={() => router.push(`/product?barcode=${product.id}`)}>
                        <Surface style={styles.card} elevation={2}>
                          <LinearGradient
                            colors={["#ffffff", getCategoryColor(product.category)]}
                            style={styles.cardContent}
                          >
                            {product.imageUrl ? (
                              <Image
                                source={{ uri: product.imageUrl }}
                                style={styles.image}
                                contentFit="cover"
                                transition={200}
                              />
                            ) : (
                              <LinearGradient
                                colors={[
                                  theme.colors.primaryContainer,
                                  theme.colors.primaryContainer + "80",
                                ]}
                                style={[styles.image, styles.placeholderImage]}
                              >
                                <IconButton
                                  icon={getCategoryIcon(product.category)}
                                  size={32}
                                  iconColor={theme.colors.primary}
                                />
                              </LinearGradient>
                            )}
                            <View style={styles.textContainer}>
                              <Text
                                variant="titleMedium"
                                style={styles.productName}
                              >
                                {product.name}
                              </Text>
                              <View style={styles.detailsContainer}>
                                <Chip
                                  icon={getCategoryIcon(product.category)}
                                  style={[
                                    styles.categoryChip,
                                    {
                                      backgroundColor:
                                        theme.colors.primaryContainer,
                                    },
                                  ]}
                                  textStyle={{ color: theme.colors.primary }}
                                >
                                  {product.category}
                                </Chip>
                                <Chip
                                  icon="clock"
                                  style={[
                                    styles.expiryChip,
                                    {
                                      backgroundColor:
                                        getExpiryColor(daysUntilExpiry),
                                    },
                                  ]}
                                  textStyle={{ color: "#fff" }}
                                >
                                  {getExpiryStatus(daysUntilExpiry)}
                                </Chip>
                              </View>
                              <Text variant="bodySmall" style={styles.dateText}>
                                {new Date(product.expiryDate).toLocaleDateString(
                                  undefined,
                                  {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </Text>
                            </View>
                          </LinearGradient>
                        </Surface>
                      </Pressable>
                    </Swipeable>
                  </Animated.View>
                );
              })
            )
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 16,
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  productName: {
    marginBottom: 8,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  detailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    height: 32,
    borderRadius: 16,
  },
  expiryChip: {
    height: 32,
    borderRadius: 16,
  },
  dateText: {
    color: "#666",
    fontSize: 13,
  },
  emptyCard: {
    margin: 16,
    borderRadius: 24,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  emptyContent: {
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    lineHeight: 22,
  },
  deleteAction: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    marginVertical: 8,
    marginRight: 16,
    borderRadius: 24,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#fff",
  },
  headerTitle: {
    marginBottom: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  calendarButton: {
    borderRadius: 16,
    backgroundColor: "#4CAF50",
  },
  sortContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    flex: 1,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  categoryTitle: {
    fontWeight: '600',
  },
  categoryCount: {
    color: '#666',
  },
});
