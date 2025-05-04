import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { BlurView } from "expo-blur";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

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

export default function ProductScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [expiryDate, setExpiryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasCalendarPermission, setHasCalendarPermission] = useState<
    boolean | null
  >(null);
  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>(
    (params.name as string) || "Unknown Product"
  );
  const [barcode, setBarcode] = useState<string>(params.barcode as string);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [category, setCategory] = useState<string>("default");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [existingProduct, setExistingProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get calendar permissions
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        setHasCalendarPermission(status === "granted");

        // Get image permissions
        const imagePermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (imagePermission.status !== "granted") {
          console.warn("Camera roll access is required to add product images.");
        }

        // Check if product already exists
        if (barcode) {
          const db = getFirestore(firebaseApp);
          const productRef = doc(db, "products", barcode);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const data = productSnap.data();
            setExistingProduct(data);
            setProductName(data.name || "Unknown Product");
            if (data.expiryDate) {
              setExpiryDate(new Date(data.expiryDate));
            }
            if (data.category) {
              setCategory(data.category);
            }
            if (data.imageUrl) {
              setImage(data.imageUrl);
            }
            if (data.quantity) {
              setQuantity(data.quantity.toString());
            }
            if (data.notes) {
              setNotes(data.notes);
            }
            
            // Notify user
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            // Try to predict expiry based on product name
            predictExpiry(productName);
          }
        }
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [barcode, productName]);

  const predictExpiry = (name: string) => {
    // Simple prediction logic - in a real app this would be more sophisticated
    const nameLower = name.toLowerCase();
    
    // Try to find a match in our expiry estimates
    const matchedCategory = Object.keys(FOOD_EXPIRY_ESTIMATES).find(
      key => nameLower.includes(key)
    ) || "default";
    
    setCategory(matchedCategory);
    
    // Set predicted expiry date
    const predictedDays = FOOD_EXPIRY_ESTIMATES[matchedCategory];
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + predictedDays);
    setExpiryDate(newDate);
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
    setCategory(cat);
    
    // Update expiry date based on category
    const predictedDays = FOOD_EXPIRY_ESTIMATES[cat] || FOOD_EXPIRY_ESTIMATES.default;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + predictedDays);
    setExpiryDate(newDate);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddToCalendar = async () => {
    if (isAddingToCalendar) return;
    
    Keyboard.dismiss();
    setIsAddingToCalendar(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // First, ensure we have calendar permissions
      if (!hasCalendarPermission) {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "Calendar access is required to add expiry dates."
          );
          return;
        }
        setHasCalendarPermission(true);
      }

      // Get the default calendar
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((cal) => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert(
          "Error",
          "No calendar found. Please set up a calendar on your device."
        );
        return;
      }

      // Create the event
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: `${productName} Expires`,
        startDate: expiryDate,
        endDate: expiryDate,
        alarms: [
          { relativeOffset: -7 * 24 * 60 }, // 1 week before
          { relativeOffset: -24 * 60 }, // 1 day before
        ],
        notes: `Product: ${productName}\nBarcode: ${barcode}\nQuantity: ${quantity}\n${notes}`,
      });

      if (!eventId) {
        throw new Error("Failed to create calendar event");
      }

      // Store in Firebase
      const db = getFirestore(firebaseApp);
      const productRef = doc(db, "products", barcode);

      const productData = {
        name: productName,
        barcode: barcode,
        expiryDate: expiryDate.toISOString().split("T")[0],
        addedAt: new Date().toISOString(),
        calendarEventId: eventId,
        category: category,
        quantity: parseInt(quantity) || 1,
        notes: notes,
        ...(image && { imageUrl: image }),
      };

      try {
        await setDoc(productRef, productData, { merge: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Expiry date added to calendar and saved!");
        router.push("/");
      } catch (firebaseError) {
        console.error("Firebase error:", firebaseError);
        
        // If Firebase fails, try to delete the calendar event
        try {
          await Calendar.deleteEventAsync(eventId);
        } catch (calendarError) {
          console.error("Failed to delete calendar event:", calendarError);
        }
        
        Alert.alert(
          "Partial Success",
          "Expiry date was added to your calendar, but failed to save to the cloud. You can try again later.",
          [{ text: "OK", onPress: () => router.push("/") }]
        );
      }
    } catch (error) {
      console.error("Error saving product:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        "Failed to save product. Please check your internet connection and try again.",
        [{ text: "OK", onPress: () => setIsAddingToCalendar(false) }]
      );
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading product information...</Text>
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
        <Chip 
          style={styles.existingChip} 
          icon="information"
          mode="outlined"
        >
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
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickImage}
              >
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
          <TouchableOpacity
            style={styles.imagePlaceholder}
            onPress={pickImage}
          >
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
            onChangeText={setProductName}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.barcodeContainer}>
            <MaterialCommunityIcons
              name="barcode"
              size={20}
              color={theme.colors.outline}
            />
            <Text variant="bodyMedium" style={styles.barcode}>
              {barcode}
            </Text>
          </View>
          
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Quantity
          </Text>
          <View style={styles.quantityContainer}>
            <IconButton
              icon="minus"
              size={20}
              onPress={() => {
                const current = parseInt(quantity) || 1;
                if (current > 1) {
                  setQuantity((current - 1).toString());
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              disabled={parseInt(quantity) <= 1}
            />
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              style={styles.quantityInput}
              keyboardType="numeric"
              mode="outlined"
            />
            <IconButton
              icon="plus"
              size={20}
              onPress={() => {
                const current = parseInt(quantity) || 1;
                setQuantity((current + 1).toString());
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </View>
          
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
                  selected={category === cat.key}
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
              ({Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days)
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
          onPress={handleAddToCalendar}
          disabled={isAddingToCalendar}
          loading={isAddingToCalendar}
          icon={({ size, color }) => (
            <MaterialCommunityIcons
              name="calendar-plus"
              size={size}
              color={color}
            />
          )}
          style={styles.button}
        >
          {existingProduct ? "Update Product" : "Add to Calendar"}
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
