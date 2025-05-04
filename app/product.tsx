import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

export default function ProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [expiryDate, setExpiryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [hasCalendarPermission, setHasCalendarPermission] = useState<
    boolean | null
  >(null);
  const [image, setImage] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>(
    (params.name as string) || "Unknown Product"
  );
  const [barcode, setBarcode] = useState<string>(params.barcode as string);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  useEffect(() => {
    const getCalendarPermissions = async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      setHasCalendarPermission(status === "granted");
    };

    const getImagePermissions = async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Camera roll access is required to add product images."
        );
      }
    };

    getCalendarPermissions();
    getImagePermissions();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleAddToCalendar = async () => {
    if (isAddingToCalendar) return;
    setIsAddingToCalendar(true);

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
      console.log("Available calendars:", calendars);

      const defaultCalendar =
        calendars.find((cal) => cal.isPrimary) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert(
          "Error",
          "No calendar found. Please set up a calendar on your device."
        );
        return;
      }

      console.log("Using calendar:", defaultCalendar);

      // Create the event
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: `${productName} Expires`,
        startDate: new Date(expiryDate),
        endDate: new Date(expiryDate),
        alarms: [{ relativeOffset: -7 * 24 * 60 }], // 1 week before
        notes: `Product: ${productName}\nBarcode: ${barcode}`,
      });

      console.log("Created calendar event with ID:", eventId);

      if (!eventId) {
        throw new Error("Failed to create calendar event");
      }

      // Store in Firebase
      const db = getFirestore(firebaseApp);
      const productRef = doc(db, "products", barcode);

      const productData = {
        name: productName,
        barcode: barcode,
        expiryDate: expiryDate,
        addedAt: new Date().toISOString(),
        calendarEventId: eventId,
        ...(image && { imageUrl: image }),
      };

      try {
        console.log("Saving to Firebase:", productData);
        await setDoc(productRef, productData, { merge: true });
        console.log("Successfully saved to Firebase");
        Alert.alert("Success", "Expiry date added to calendar and saved!");
        router.push("/");
      } catch (firebaseError) {
        console.error("Firebase error:", firebaseError);
        // If Firebase fails, try to delete the calendar event
        try {
          await Calendar.deleteEventAsync(eventId);
          console.log("Deleted calendar event after Firebase failure");
        } catch (calendarError) {
          console.error("Failed to delete calendar event:", calendarError);
        }
        // Show a different message for Firebase failure
        Alert.alert(
          "Partial Success",
          "Expiry date was added to your calendar, but failed to save to the cloud. You can try again later.",
          [
            {
              text: "OK",
              onPress: () => router.push("/"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert(
        "Error",
        "Failed to save product. Please check your internet connection and try again.",
        [
          {
            text: "OK",
            onPress: () => setIsAddingToCalendar(false),
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Product Name"
            value={productName}
            onChangeText={setProductName}
            style={styles.input}
          />
          <Text variant="bodyLarge" style={styles.barcode}>
            Barcode: {barcode}
          </Text>
          <TextInput
            label="Expiry Date"
            value={expiryDate}
            onChangeText={setExpiryDate}
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <Button
              mode="outlined"
              onPress={pickImage}
              style={styles.imageButton}
            >
              Add Product Image
            </Button>
          )}
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
          Add to Calendar
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
        >
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  barcode: {
    marginBottom: 16,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageButton: {
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    marginBottom: 8,
  },
});
