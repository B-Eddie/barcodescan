import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Divider,
  List,
  Switch as PaperSwitch,
  Portal,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { db } from "../firebaseConfig";

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
        const notifPrefsString = await AsyncStorage.getItem(
          "notificationPrefs"
        );
        if (notifPrefsString) {
          setNotificationPrefs(JSON.parse(notifPrefsString));
        }

        // Load app preferences
        const appPrefsString = await AsyncStorage.getItem("appPrefs");
        if (appPrefsString) {
          setAppPrefs(JSON.parse(appPrefsString));
        }

        // Get stats about data
        await fetchDataStats();
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  const saveNotificationPrefs = async () => {
    try {
      await AsyncStorage.setItem(
        "notificationPrefs",
        JSON.stringify(notificationPrefs)
      );
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    }
  };

  const saveAppPrefs = async () => {
    try {
      await AsyncStorage.setItem("appPrefs", JSON.stringify(appPrefs));
    } catch (error) {
      console.error("Error saving app preferences:", error);
    }
  };

  const fetchDataStats = async () => {
    try {
      const productsRef = collection(db, "products");
      const querySnapshot = await getDocs(productsRef);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let expiredCount = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const expiryDate = new Date(data.expiryDate);
        if (expiryDate < today) {
          expiredCount++;
        }
      });

      setTotalItems(querySnapshot.size);
      setExpiredItems(expiredCount);
    } catch (error) {
      console.error("Error fetching data stats:", error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setNotificationPrefs((prev) => ({ ...prev, enabled: true }));
        await saveNotificationPrefs();
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to receive expiry reminders.",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open Settings",
              onPress: () => Linking.openSettings(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      await requestNotificationPermission();
    } else {
      setNotificationPrefs((prev) => ({ ...prev, enabled: false }));
      await saveNotificationPrefs();
    }
  };

  const handleClearAllData = async () => {
    try {
      setIsProcessing(true);
      const productsRef = collection(db, "products");
      const querySnapshot = await getDocs(productsRef);

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      await fetchDataStats();
      Alert.alert("Success", "All data has been cleared.");
    } catch (error) {
      console.error("Error clearing data:", error);
      Alert.alert("Error", "Failed to clear data. Please try again.");
    } finally {
      setIsProcessing(false);
      setClearDataDialog(false);
    }
  };

  const handleDeleteExpired = async () => {
    try {
      setIsProcessing(true);
      const productsRef = collection(db, "products");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(
        productsRef,
        where("expiryDate", "<", today.toISOString().split("T")[0])
      );
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      await fetchDataStats();
      Alert.alert("Success", "Expired items have been deleted.");
    } catch (error) {
      console.error("Error deleting expired items:", error);
      Alert.alert("Error", "Failed to delete expired items. Please try again.");
    } finally {
      setIsProcessing(false);
      setDeleteExpiredDialog(false);
    }
  };

  const handleExportData = () => {
    // TODO: Implement data export
    Alert.alert("Coming Soon", "Data export feature will be available soon.");
  };

  const handleImportData = () => {
    // TODO: Implement data import
    Alert.alert("Coming Soon", "Data import feature will be available soon.");
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header}>
        <MaterialCommunityIcons
          name="fridge-outline"
          size={40}
          color={theme.colors.primary}
        />
        <Text variant="headlineMedium" style={styles.title}>
          Food Expiry Tracker
        </Text>
        <Text variant="bodyMedium" style={styles.version}>
          Version 1.0.0
        </Text>
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Notifications
          </Text>

          <List.Item
            title="Enable Notifications"
            description="Receive reminders about expiring items"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => (
              <PaperSwitch
                value={notificationPrefs.enabled}
                onValueChange={toggleNotifications}
              />
            )}
          />

          {notificationPrefs.enabled && (
            <>
              <Divider style={styles.divider} />
              <List.Item
                title="Days Before Expiry"
                description="When to notify about expiring items"
                left={(props) => <List.Icon {...props} icon="clock" />}
                right={(props) => (
                  <SegmentedButtons
                    value={notificationPrefs.expiringSoon.toString()}
                    onValueChange={(value) => {
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        expiringSoon: parseInt(value),
                      }));
                      saveNotificationPrefs();
                    }}
                    buttons={[
                      { value: "3", label: "3" },
                      { value: "7", label: "7" },
                      { value: "14", label: "14" },
                    ]}
                  />
                )}
              />
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            App Preferences
          </Text>

          <List.Item
            title="Theme"
            description="Choose your preferred theme"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={(props) => (
              <SegmentedButtons
                value={appPrefs.theme}
                onValueChange={(value) => {
                  setAppPrefs((prev) => ({ ...prev, theme: value }));
                  saveAppPrefs();
                }}
                buttons={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "auto", label: "Auto" },
                ]}
              />
            )}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Haptic Feedback"
            description="Enable vibration feedback"
            left={(props) => <List.Icon {...props} icon="vibrate" />}
            right={(props) => (
              <PaperSwitch
                value={appPrefs.haptics}
                onValueChange={(value) => {
                  setAppPrefs((prev) => ({ ...prev, haptics: value }));
                  saveAppPrefs();
                }}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Management
          </Text>

          <List.Item
            title="Total Items"
            description={`${totalItems} items in your inventory`}
            left={(props) => <List.Icon {...props} icon="package-variant" />}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Expired Items"
            description={`${expiredItems} items have expired`}
            left={(props) => <List.Icon {...props} icon="alert" />}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Clear All Data"
            description="Remove all items from your inventory"
            left={(props) => <List.Icon {...props} icon="delete" />}
            onPress={() => setClearDataDialog(true)}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Delete Expired Items"
            description="Remove all expired items from your inventory"
            left={(props) => <List.Icon {...props} icon="delete-clock" />}
            onPress={() => setDeleteExpiredDialog(true)}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Export Data"
            description="Backup your inventory data"
            left={(props) => <List.Icon {...props} icon="export" />}
            onPress={handleExportData}
          />

          <Divider style={styles.divider} />

          <List.Item
            title="Import Data"
            description="Restore your inventory data"
            left={(props) => <List.Icon {...props} icon="import" />}
            onPress={handleImportData}
          />
        </Card.Content>
      </Card>

      <View style={styles.aboutSection}>
        <Button
          mode="text"
          onPress={() => Linking.openURL("https://example.com/privacy")}
          style={styles.aboutButton}
        >
          Privacy Policy
        </Button>
        <Button
          mode="text"
          onPress={() => Linking.openURL("https://example.com/terms")}
          style={styles.aboutButton}
        >
          Terms of Service
        </Button>
        <Button
          mode="text"
          onPress={() => Linking.openURL("https://example.com/help")}
          style={styles.aboutButton}
        >
          Help & Support
        </Button>
      </View>

      {/* Confirmation Dialogs */}
      <Portal>
        <Dialog
          visible={clearDataDialog}
          onDismiss={() => setClearDataDialog(false)}
        >
          <Dialog.Title>Clear All Data</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete all items from your inventory?
              This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearDataDialog(false)}>Cancel</Button>
            <Button
              onPress={handleClearAllData}
              textColor={theme.colors.error}
              loading={isProcessing}
              disabled={isProcessing}
            >
              Delete All
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteExpiredDialog}
          onDismiss={() => setDeleteExpiredDialog(false)}
        >
          <Dialog.Title>Delete Expired Items</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to delete all expired items from your
              inventory? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteExpiredDialog(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteExpired}
              textColor={theme.colors.error}
              loading={isProcessing}
              disabled={isProcessing}
            >
              Delete Expired
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    marginBottom: 16,
    padding: 24,
    alignItems: "center",
    elevation: 0,
  },
  title: {
    fontWeight: "bold",
    marginTop: 8,
  },
  version: {
    color: "#666",
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  aboutSection: {
    marginVertical: 16,
    alignItems: "center",
  },
  aboutButton: {
    marginVertical: 4,
  },
});
