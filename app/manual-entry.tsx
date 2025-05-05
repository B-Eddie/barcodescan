import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { ref, set } from "firebase/database";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

export default function ManualEntryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    "Dairy",
    "Meat",
    "Produce",
    "Bakery",
    "Canned",
    "Frozen",
    "Dry Goods",
    "Beverages",
    "Snacks",
    "Other",
  ];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a product name");
      return;
    }

    if (!auth.currentUser?.email) {
      Alert.alert("Error", "You must be logged in to add products");
      return;
    }

    try {
      setIsSaving(true);
      const productId = Date.now().toString();
      const productData = {
        name: name.trim(),
        quantity: parseInt(quantity) || 1,
        expiryDate: expiryDate.toISOString().split("T")[0],
        category: category || "Other",
        addedAt: new Date().toISOString(),
        userId: auth.currentUser.email,
      };

      // Store under user's email in the database
      const productRef = ref(
        database,
        `users/${auth.currentUser.email}/products/${productId}`
      );
      await set(productRef, productData);

      Alert.alert("Success", "Product added successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error saving product:", error);
      Alert.alert("Error", "Failed to save product. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Product Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.dateContainer}>
            <Text variant="bodyLarge" style={styles.label}>
              Expiry Date
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
            >
              {expiryDate.toLocaleDateString()}
            </Button>
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          <View style={styles.categoryContainer}>
            <Text variant="bodyLarge" style={styles.label}>
              Category
            </Text>
            <View style={styles.chipContainer}>
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                  style={styles.chip}
                >
                  {cat}
                </Chip>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={isSaving}
        disabled={isSaving}
        style={styles.saveButton}
      >
        Save Product
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  dateContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  dateButton: {
    marginTop: 8,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 16,
  },
});
