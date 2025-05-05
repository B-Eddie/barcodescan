import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { get, ref, remove, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { auth, database } from "../firebaseConfig";

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFS = {
  enabled: true,
  expiringSoon: 7, // days before expiry
  dayBefore: true,
  dayOf: true,
  expired: true,
};

// Default app preferences
const DEFAULT_APP_PREFS = {
  theme: "auto",
  haptics: true,
  defaultExpiryReminder: 7,
  autoBackup: false,
  analytics: true,
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const currentUser = auth.currentUser;

  // State for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState(
    DEFAULT_NOTIFICATION_PREFS
  );

  // State for app preferences
  const [appPrefs, setAppPrefs] = useState(DEFAULT_APP_PREFS);

  // State for data management
  const [totalItems, setTotalItems] = useState(0);
  const [expiredItems, setExpiredItems] = useState(0);

  // Dialog states
  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [deleteExpiredDialog, setDeleteExpiredDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Accordion state
  const [reminderSettingsExpanded, setReminderSettingsExpanded] =
    useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load notification preferences
        const notificationPrefs = await AsyncStorage.getItem(
          "notificationPrefs"
        );
        if (notificationPrefs) {
          setNotificationPrefs(JSON.parse(notificationPrefs));
        } else {
          setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS);
        }

        // Load app preferences
        const appPrefs = await AsyncStorage.getItem("appPrefs");
        if (appPrefs) {
          setAppPrefs(JSON.parse(appPrefs));
        } else {
          setAppPrefs(DEFAULT_APP_PREFS);
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        Alert.alert("Error", "Failed to load settings. Please try again.");
      }
    };

    loadSettings();
  }, []);

  const fetchDataStats = async () => {
    if (!currentUser?.email) return;

    try {
      const productsRef = ref(database, `users/${currentUser.email}/products`);
      const snapshot = await get(productsRef);

      if (snapshot.exists()) {
        const products = snapshot.val();
        const totalItems = Object.keys(products).length;
        const today = new Date().toISOString().split("T")[0];
        let expiredItems = 0;

        Object.values(products).forEach((product: any) => {
          if (product.expiryDate && product.expiryDate < today) {
            expiredItems++;
          }
        });

        setTotalItems(totalItems);
        setExpiredItems(expiredItems);
      }
    } catch (error) {
      console.error("Error fetching data stats:", error);
      Alert.alert("Error", "Failed to load data statistics.");
    }
  };

  const handleClearAllData = async () => {
    if (!currentUser?.email) {
      Alert.alert("Error", "You must be logged in to clear data");
      return;
    }

    try {
      const productsRef = ref(database, `users/${currentUser.email}/products`);
      await remove(productsRef);
      await AsyncStorage.clear();
      Alert.alert("Success", "All data has been cleared successfully!");
      fetchDataStats();
    } catch (error) {
      console.error("Error clearing data:", error);
      Alert.alert("Error", "Failed to clear data. Please try again.");
    }
  };

  const handleDeleteExpired = async () => {
    if (!currentUser?.email) {
      Alert.alert("Error", "You must be logged in to delete expired items");
      return;
    }

    try {
      const productsRef = ref(database, `users/${currentUser.email}/products`);
      const snapshot = await get(productsRef);
      const today = new Date().toISOString().split("T")[0];
      const batch: { [key: string]: null } = {};

      if (snapshot.exists()) {
        const products = snapshot.val();
        Object.entries(products).forEach(([key, product]: [string, any]) => {
          if (product.expiryDate && product.expiryDate < today) {
            batch[key] = null;
          }
        });

        if (Object.keys(batch).length > 0) {
          await set(productsRef, batch);
          Alert.alert(
            "Success",
            "Expired items have been deleted successfully!"
          );
          fetchDataStats();
        } else {
          Alert.alert("Info", "No expired items found.");
        }
      }
    } catch (error) {
      console.error("Error deleting expired items:", error);
      Alert.alert("Error", "Failed to delete expired items. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <MaterialCommunityIcons
          name="cog"
          size={24}
          color={theme.colors.primary}
        />
        <Text variant="headlineMedium" style={styles.headerText}>
          Settings
        </Text>
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge">Data Management</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{totalItems}</Text>
              <Text variant="bodyMedium">Total Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium">{expiredItems}</Text>
              <Text variant="bodyMedium">Expired Items</Text>
            </View>
          </View>
          <Button
            mode="contained"
            onPress={() => setDeleteExpiredDialog(true)}
            style={styles.button}
          >
            Delete Expired Items
          </Button>
          <Button
            mode="outlined"
            onPress={() => setClearDataDialog(true)}
            style={styles.button}
          >
            Clear All Data
          </Button>
        </Card.Content>
      </Card>

      <Portal>
        <Dialog
          visible={clearDataDialog}
          onDismiss={() => setClearDataDialog(false)}
        >
          <Dialog.Title>Clear All Data</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to clear all your data? This action cannot
              be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearDataDialog(false)}>Cancel</Button>
            <Button onPress={handleClearAllData}>Clear</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteExpiredDialog}
          onDismiss={() => setDeleteExpiredDialog(false)}
        >
          <Dialog.Title>Delete Expired Items</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete all expired items? This action
              cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteExpiredDialog(false)}>
              Cancel
            </Button>
            <Button onPress={handleDeleteExpired}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Account</Text>
          <Button mode="outlined" onPress={handleLogout} style={styles.button}>
            Logout
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  card: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  logoutButton: {
    marginTop: 24,
  },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  headerText: {
    marginLeft: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  statItem: {
    alignItems: "center",
  },
});
