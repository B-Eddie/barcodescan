import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { get, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

// Common food expiry estimates (in days)
const FOOD_EXPIRY_ESTIMATES: Record<string, number> = {
  milk: 7,
  bread: 7,
  eggs: 21,
  cheese: 14,
  yogurt: 10,
  meat: 3,
  fish: 2,
  fruits: 7,
  vegetables: 7,
  juice: 7,
  cereal: 180,
  pasta: 365,
  rice: 365,
  canned: 730,
  frozen: 180,
  snacks: 90,
  default: 14,
};

interface ProductData {
  name: string;
  expiryDate: string;
  category: string;
  quantity: number;
  imageUrl?: string;
  brand?: string;
}

const CATEGORIES = [
  "dairy",
  "meat",
  "fruits",
  "vegetables",
  "bakery",
  "canned",
  "frozen",
  "snacks",
  "other",
];

export default function ProductScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { barcode, name, brand, imageUrl, category } = useLocalSearchParams();
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [productName, setProductName] = useState((name as string) || "");
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(
    (category as string) || "other"
  );
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasCalendarPermission, setHasCalendarPermission] = useState<
    boolean | null
  >(null);
  const [image, setImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [existingProduct, setExistingProduct] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(false);
  const MAX_RETRIES = 3;

  // Suggested expiry categories
  const categories = [
    { key: "dairy", label: "Dairy", icon: "cheese" },
    { key: "meat", label: "Meat", icon: "food-steak" },
    { key: "fruits", label: "Fruits", icon: "fruit-watermelon" },
    { key: "vegetables", label: "Vegetables", icon: "carrot" },
    { key: "bakery", label: "Bakery", icon: "bread-slice" },
    { key: "canned", label: "Canned", icon: "food-variant" },
    { key: "frozen", label: "Frozen", icon: "snowflake" },
    { key: "snacks", label: "Snacks", icon: "cookie" },
  ];

  // Enable offline persistence
  useEffect(() => {
    // No need to manually enable persistence as it's handled by firestore().settings()
  }, []);

  // Network status listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (barcode) {
      fetchProduct();
    }
  }, [barcode]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error("User not logged in");
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );
      const snapshot = await get(productRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setProductData(data);
        setProductName(data.name);
        setExpiryDate(new Date(data.expiryDate));
        setSelectedCategory(data.category);
        setQuantity(data.quantity.toString());
        if (data.imageUrl) setImage(data.imageUrl);
        if (data.notes) setNotes(data.notes);
        setExistingProduct(data);
      } else {
        // Set default expiry date to 7 days from now for new products
        const defaultExpiryDate = new Date();
        defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 7);
        setExpiryDate(defaultExpiryDate);
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      Alert.alert("Error", "Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const predictExpiry = (name: string) => {
    // Simple prediction logic - in a real app this would be more sophisticated
    const nameLower = name.toLowerCase();

    // Try to find a match in our expiry estimates
    const matchedCategory =
      Object.keys(FOOD_EXPIRY_ESTIMATES).find((key) =>
        nameLower.includes(key)
      ) || "default";

    setSelectedCategory(matchedCategory);

    // Set predicted expiry date
    const predictedDays = FOOD_EXPIRY_ESTIMATES[matchedCategory];
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + predictedDays);
    setExpiryDate(newDate);

    // Set productData for new product
    setProductData({
      name: name,
      expiryDate: newDate.toISOString(),
      category: matchedCategory,
      quantity: parseInt(quantity) || 1,
      imageUrl: image,
      brand: brand,
    });
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const selectCategory = (cat: string) => {
    setSelectedCategory(cat);

    // Update expiry date based on category
    const predictedDays =
      FOOD_EXPIRY_ESTIMATES[cat] || FOOD_EXPIRY_ESTIMATES.default;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + predictedDays);
    setExpiryDate(newDate);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert("Error", "Please enter a product name");
      return;
    }

    try {
      setSaving(true);
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        throw new Error("User not logged in");
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );
      const productRef = ref(
        database,
        `users/${encodedEmail}/products/${barcode}`
      );

      const productData: ProductData = {
        name: productName.trim(),
        expiryDate: expiryDate.toISOString().split("T")[0],
        category: selectedCategory,
        quantity: parseInt(quantity) || 1,
        imageUrl: imageUrl as string | undefined,
        brand: brand as string | undefined,
      };

      await set(productRef, productData);
      Alert.alert("Success", "Product saved successfully");
      router.back();
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading product information...</Text>
        {isOffline && (
          <Text style={styles.offlineText}>
            You're offline. Using cached data if available.
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {existingProduct && (
        <Chip style={styles.existingChip} icon="information" mode="outlined">
          This product is already in your database
        </Chip>
      )}

      <View style={styles.imageContainer}>
        {image ? (
          <View>
            <Image
              source={{ uri: image }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
            <View style={styles.imageOverlay}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <BlurView intensity={80} style={styles.blurButton}>
                  <MaterialCommunityIcons
                    name="camera"
                    size={20}
                    color="white"
                  />
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
            <MaterialCommunityIcons
              name="camera-plus"
              size={40}
              color={theme.colors.outline}
            />
            <Text style={styles.imagePlaceholderText}>Add Product Image</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Product Name"
            value={productName}
            onChangeText={(text) => {
              setProductName(text);
              setProductData((prev) => (prev ? { ...prev, name: text } : null));
            }}
            style={styles.input}
          />

          <TextInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
          />

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Food Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
          >
            <View style={styles.categoryContainer}>
              {categories.map((cat) => (
                <Chip
                  key={cat.key}
                  icon={cat.icon}
                  selected={selectedCategory === cat.key}
                  onPress={() => selectCategory(cat.key)}
                  style={styles.categoryChip}
                  selectedColor={theme.colors.primary}
                >
                  {cat.label}
                </Chip>
              ))}
            </View>
          </ScrollView>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Expiry Date
          </Text>
          <Pressable
            style={styles.dateContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons
              name="calendar"
              size={24}
              color={theme.colors.primary}
            />
            <Text variant="bodyLarge" style={styles.dateText}>
              {formatDate(expiryDate)}
            </Text>
            <Text variant="bodyMedium" style={styles.daysUntil}>
              (
              {Math.ceil(
                (expiryDate.getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              days)
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={expiryDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant={theme.dark ? "dark" : "light"}
            />
          )}

          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            style={styles.notesInput}
            multiline
            numberOfLines={3}
            mode="outlined"
          />
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
        >
          Save Product
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  offlineText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  existingChip: {
    alignSelf: "center",
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  notesInput: {
    marginTop: 8,
  },
  barcodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  barcode: {
    marginLeft: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
  },
  imageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  blurButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  dateText: {
    marginLeft: 8,
    fontWeight: "500",
  },
  daysUntil: {
    marginLeft: 8,
    color: "#666",
  },
  categoryScrollView: {
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingVertical: 4,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInput: {
    width: 80,
    textAlign: "center",
  },
});
