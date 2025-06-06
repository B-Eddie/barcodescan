import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { push, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
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
import { analyzeReceipt } from "../services/receiptAnalysis";

interface ReceiptItem {
  id: string;
  name: string;
  purchaseDate: string;
  estimatedExpiryDate: string;
  confidence: number;
  category: string;
  quantity: number;
}

export default function ReceiptScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [purchaseDate, setPurchaseDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle incoming parameters from navigation
  useEffect(() => {
    if (params.imageUri && params.items && params.purchaseDate) {
      setReceiptImage(params.imageUri as string);
      setPurchaseDate(params.purchaseDate as string);

      try {
        const items = JSON.parse(params.items as string);
        setReceiptItems(items);
      } catch (error) {
        console.error("Error parsing items from params:", error);
        setError("Failed to load receipt results");
      }
    }
  }, [params.imageUri, params.items, params.purchaseDate]);

  const handleScanReceipt = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setReceiptImage(result.assets[0].uri);
        await processReceipt(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error scanning receipt:", error);
      setError("Failed to scan receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const processReceipt = async (imageUri: string) => {
    try {
      setProcessing(true);
      setError(null);

      const result = await analyzeReceipt(imageUri);
      setReceiptItems(result.items);
      setPurchaseDate(result.purchaseDate);
    } catch (error) {
      console.error("Error processing receipt:", error);
      setError("Failed to analyze receipt. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> =
      {
        dairy: "cheese",
        meat: "food-steak",
        produce: "fruit-watermelon",
        vegetables: "carrot",
        bakery: "bread-slice",
        canned: "food-variant",
        frozen: "snowflake",
        snacks: "cookie",
        beverages: "cup",
        other: "food",
      };
    return icons[category] || icons.other;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "#4CAF50";
    if (confidence >= 0.7) return "#FFC107";
    return "#F44336";
  };

  const handleSaveItems = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        Alert.alert("Error", "You must be logged in to save items");
        return;
      }

      const encodedEmail = encodeURIComponent(
        currentUser.email.replace(/\./g, ",")
      );

      // Save each item to Firebase
      for (const item of receiptItems) {
        const newItemRef = push(
          ref(database, `users/${encodedEmail}/products`)
        );
        await set(newItemRef, {
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          purchaseDate: item.purchaseDate,
          expiryDate: item.estimatedExpiryDate,
          confidence: item.confidence,
          addedAt: new Date().toISOString(),
        });
      }

      Alert.alert(
        "Success",
        `Saved ${receiptItems.length} items to your pantry!`,
        [{ text: "OK", onPress: () => router.push("/") }]
      );
    } catch (error) {
      console.error("Error saving items:", error);
      Alert.alert("Error", "Failed to save items to your pantry");
    }
  };

  // If we have results, show them
  if (receiptItems.length > 0) {
    return (
      <ScrollView style={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={() => router.back()}
            />
            <Text variant="headlineMedium" style={styles.title}>
              Receipt Analysis
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {receiptImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: receiptImage }}
                style={styles.receiptImage}
              />
            </View>
          )}

          <View style={styles.resultsContainer}>
            <Text variant="titleLarge" style={styles.resultsTitle}>
              Found {receiptItems.length} Items
            </Text>
            <Text variant="bodyMedium" style={styles.purchaseDate}>
              Purchase Date: {purchaseDate}
            </Text>

            {receiptItems.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <Card.Content>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <MaterialCommunityIcons
                        name={getCategoryIcon(item.category)}
                        size={24}
                        color={theme.colors.primary}
                      />
                      <View style={styles.itemDetails}>
                        <Text variant="titleMedium">{item.name}</Text>
                        <Text variant="bodySmall" style={styles.category}>
                          {item.category} • Qty: {item.quantity}
                        </Text>
                      </View>
                    </View>
                    <Chip
                      style={[
                        styles.confidenceChip,
                        {
                          backgroundColor: getConfidenceColor(item.confidence),
                        },
                      ]}
                      textStyle={styles.confidenceText}
                    >
                      {Math.round(item.confidence * 100)}% confidence
                    </Chip>
                  </View>

                  <View style={styles.datesContainer}>
                    <View style={styles.dateItem}>
                      <Text variant="bodySmall" style={styles.dateLabel}>
                        Purchase Date
                      </Text>
                      <Text variant="bodyMedium">{item.purchaseDate}</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text variant="bodySmall" style={styles.dateLabel}>
                        Estimated Expiry
                      </Text>
                      <Text variant="bodyMedium">
                        {item.estimatedExpiryDate}
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => router.back()}
                style={styles.actionButton}
                icon="arrow-left"
              >
                Back to Camera
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveItems}
                style={styles.actionButton}
                icon="check"
              >
                Save Items
              </Button>
            </View>
          </View>
        </Surface>
      </ScrollView>
    );
  }

  // Show upload interface if no results
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text variant="headlineMedium" style={styles.title}>
            Scan Receipt
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <Text variant="bodyLarge" style={styles.description}>
          Take a photo of your receipt to automatically analyze food items and
          predict their expiration dates
        </Text>

        {error && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}

        {receiptImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
            <IconButton
              icon="close-circle"
              size={24}
              style={styles.removeImage}
              onPress={() => {
                setReceiptImage(null);
                setReceiptItems([]);
                setPurchaseDate(null);
                setError(null);
              }}
            />
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={handleScanReceipt}
            style={styles.button}
            loading={loading}
            disabled={loading}
            icon="camera"
          >
            Select Receipt Photo
          </Button>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.processingText}>Analyzing receipt...</Text>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  card: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  title: {
    marginBottom: 16,
    fontWeight: "600",
  },
  description: {
    marginBottom: 24,
    color: "#666",
    lineHeight: 24,
  },
  errorText: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
  imageContainer: {
    position: "relative",
    marginVertical: 16,
  },
  receiptImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  processingContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  processingText: {
    marginTop: 12,
    color: "#666",
  },
  resultsContainer: {
    marginTop: 24,
  },
  resultsTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  purchaseDate: {
    color: "#666",
    marginBottom: 16,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  category: {
    color: "#666",
    marginTop: 2,
    textTransform: "capitalize",
  },
  confidenceChip: {
    marginLeft: 8,
  },
  confidenceText: {
    color: "#fff",
    fontWeight: "600",
  },
  datesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    color: "#666",
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
});
