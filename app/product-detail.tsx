import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
import { createCalendarEvent, deleteCalendarEvent } from "../utils/calendar";

interface Product {
  id: string;
  name: string;
  expiryDate: string;
  category: string;
  quantity: number;
  imageUrl?: string;
  brand?: string;
  calendarEventId?: string;
  // Nutritional information
  nutritionInfo?: {
    caloriesPerServing?: number;
    servingSize?: string;
    carbs?: {
      amount: number;
      dailyValue: number;
    };
    protein?: {
      amount: number;
      dailyValue: number;
    };
    fat?: {
      amount: number;
      dailyValue: number;
    };
  };
  ingredients?: string[];
  ingredientsImageUrl?: string;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { barcode } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const { width } = Dimensions.get("window");

  useEffect(() => {
    fetchProduct();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) return;

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );
      const snapshot = await get(productRef);

      if (snapshot.exists()) {
        setProduct({
          id: snapshot.key || "",
          ...snapshot.val(),
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarToggle = async () => {
    if (!product) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser?.email) return;

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );

      if (product.calendarEventId) {
        // Remove from calendar
        const success = await deleteCalendarEvent(product.calendarEventId);
        if (success) {
          await update(productRef, { calendarEventId: null });
          setProduct((prev) =>
            prev ? { ...prev, calendarEventId: undefined } : null
          );
          Alert.alert("Success", "Removed from calendar");
        }
      } else {
        // Add to calendar
        const expiryDate = new Date(product.expiryDate);
        const eventId = await createCalendarEvent({
          title: `${product.name} Expires`,
          startDate: expiryDate,
          endDate: expiryDate,
          notes: `Product: ${product.name}\nCategory: ${product.category}\nQuantity: ${product.quantity}`,
          location: "Your Pantry",
        });

        if (eventId) {
          await update(productRef, { calendarEventId: eventId });
          setProduct((prev) =>
            prev ? { ...prev, calendarEventId: eventId } : null
          );
          Alert.alert("Success", "Added to calendar");
        }
      }
    } catch (error) {
      console.error("Error toggling calendar event:", error);
      Alert.alert("Error", "Failed to update calendar");
    }
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

  const getExpiryStatus = (days: number) => {
    if (days < 0) return "Expired";
    if (days === 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    return `Expires in ${days} days`;
  };

  const getExpiryColor = (days: number) => {
    if (days < 0) return theme.colors.error;
    if (days <= 3) return theme.colors.error;
    if (days <= 7) return theme.colors.warning;
    return theme.colors.primary;
  };

  if (loading) {
    return (
      <LinearGradient
        colors={["#f6f7f9", "#ffffff"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </LinearGradient>
    );
  }

  if (!product) {
    return (
      <LinearGradient
        colors={["#f6f7f9", "#ffffff"]}
        style={styles.errorContainer}
      >
        <IconButton
          icon="alert-circle"
          size={48}
          iconColor={theme.colors.error}
        />
        <Text style={styles.errorText}>Product not found</Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </LinearGradient>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(product.expiryDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <LinearGradient colors={["#f6f7f9", "#ffffff"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <Surface style={styles.imageCard} elevation={4}>
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
                style={styles.placeholderImage}
              >
                <IconButton
                  icon={getCategoryIcon(product.category)}
                  size={64}
                  iconColor={theme.colors.primary}
                />
              </LinearGradient>
            )}
          </Surface>

          <Surface style={styles.detailsCard} elevation={4}>
            <Text variant="headlineSmall" style={styles.productName}>
              {product.name}
            </Text>
            {product.brand && (
              <Text variant="titleMedium" style={styles.brand}>
                {product.brand}
              </Text>
            )}

            <View style={styles.chipContainer}>
              <Chip
                icon={getCategoryIcon(product.category)}
                style={[
                  styles.categoryChip,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
                textStyle={{ color: theme.colors.primary }}
              >
                {product.category}
              </Chip>
              <Chip
                icon="clock"
                style={[
                  styles.expiryChip,
                  { backgroundColor: getExpiryColor(daysUntilExpiry) },
                ]}
                textStyle={{ color: "#fff" }}
              >
                {getExpiryStatus(daysUntilExpiry)}
              </Chip>
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <IconButton
                  icon="calendar"
                  size={24}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  {new Date(product.expiryDate).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <IconButton
                  icon="package-variant"
                  size={24}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  Quantity: {product.quantity}
                </Text>
              </View>

              {/* Nutritional Information Section */}
              {product.nutritionInfo && (
                <View style={styles.nutritionSection}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Nutritional Information
                  </Text>
                  <View style={styles.nutritionGrid}>
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                      <Text style={styles.nutritionValue}>
                        {product.nutritionInfo.caloriesPerServing || '?'} kcal
                      </Text>
                      <Text style={styles.servingSize}>
                        per {product.nutritionInfo.servingSize || 'serving'}
                      </Text>
                    </View>
                    
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                      <Text style={styles.nutritionValue}>
                        {product.nutritionInfo.carbs?.amount || '?'}g
                      </Text>
                      <Text style={styles.dailyValue}>
                        {product.nutritionInfo.carbs?.dailyValue || '?'}% DV
                      </Text>
                    </View>

                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                      <Text style={styles.nutritionValue}>
                        {product.nutritionInfo.protein?.amount || '?'}g
                      </Text>
                      <Text style={styles.dailyValue}>
                        {product.nutritionInfo.protein?.dailyValue || '?'}% DV
                      </Text>
                    </View>

                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Fat</Text>
                      <Text style={styles.nutritionValue}>
                        {product.nutritionInfo.fat?.amount || '?'}g
                      </Text>
                      <Text style={styles.dailyValue}>
                        {product.nutritionInfo.fat?.dailyValue || '?'}% DV
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Ingredients Section */}
              <View style={styles.ingredientsSection}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Ingredients
                </Text>
                {product.ingredientsImageUrl ? (
                  <Image
                    source={{ uri: product.ingredientsImageUrl }}
                    style={styles.ingredientsImage}
                    contentFit="contain"
                  />
                ) : product.ingredients ? (
                  <View style={styles.ingredientsList}>
                    {product.ingredients.map((ingredient, index) => (
                      <Text key={index} style={styles.ingredientItem}>
                        • {ingredient}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noIngredientsContainer}>
                    <IconButton
                      icon="camera"
                      size={32}
                      iconColor={theme.colors.primary}
                      onPress={() => router.push(`/scan-ingredients?productId=${product.id}`)}
                    />
                    <Text style={styles.noIngredientsText}>
                      No ingredients information available
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Surface>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => router.push(`/product?barcode=${product.id}`)}
              style={styles.editButton}
              icon="pencil"
            >
              Edit Product
            </Button>
            <Button
              mode="contained"
              onPress={handleCalendarToggle}
              style={styles.calendarButton}
              icon={
                product.calendarEventId ? "calendar-remove" : "calendar-plus"
              }
            >
              {product.calendarEventId
                ? "Remove from Calendar"
                : "Add to Calendar"}
            </Button>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.backButton}
              icon="arrow-left"
            >
              Go Back
            </Button>
          </View>

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleCalendarToggle}
              style={styles.actionButton}
              icon="calendar"
            >
              Add to Calendar
            </Button>
            <Button
              mode="contained"
              onPress={() => router.push(`/scan-ingredients?productId=${product.id}`)}
              style={styles.actionButton}
              icon="format-list-bulleted"
            >
              Scan Ingredients
            </Button>
          </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#666",
    textAlign: "center",
  },
  imageCard: {
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  image: {
    width: "100%",
    height: 300,
  },
  placeholderImage: {
    width: "100%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#fff",
  },
  productName: {
    marginBottom: 8,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  brand: {
    marginBottom: 16,
    color: "#666",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  categoryChip: {
    height: 32,
    borderRadius: 16,
  },
  expiryChip: {
    height: 32,
    borderRadius: 16,
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#1a1a1a",
    marginLeft: 8,
  },
  buttonContainer: {
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  editButton: {
    borderRadius: 16,
  },
  backButton: {
    borderRadius: 16,
  },
  calendarButton: {
    borderRadius: 16,
    backgroundColor: "#4CAF50",
  },
  nutritionSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  servingSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  dailyValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  ingredientsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  ingredientsImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
  ingredientsList: {
    marginTop: 12,
  },
  ingredientItem: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 20,
  },
  noIngredientsContainer: {
    alignItems: 'center',
    marginTop: 12,
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  noIngredientsText: {
    marginTop: 8,
    marginBottom: 16,
    color: '#666',
    textAlign: 'center',
  },
  scanButton: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#1a1a1a',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});
