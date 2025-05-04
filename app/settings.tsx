import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  writeBatch,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Divider,
  List,
  MD3Colors,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Switch as PaperSwitch,
  Text,
  useTheme,
} from "react-native-paper";
import { firebaseApp } from "../firebaseConfig";

// Default notification preferences
const DEFAULT_NOTIFICATION_PREFS = {
  enabled: true,
  expiringSoon: 7, // days before expiry
  dayBefore: true,
  dayOf: true,
  expired: true
};

// Default app preferences
const DEFAULT_APP_PREFS = {
  theme: "auto",
  haptics: true,
  defaultExpiryReminder: 7,
  autoBackup: false,
  analytics: true
};

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  // State for notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  
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
  const [reminderSettingsExpanded, setReminderSettingsExpanded] = useState(true);
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load notification preferences
        const notifPrefsString = await AsyncStorage.getItem('notificationPrefs');
        if (notifPrefsString) {
          setNotificationPrefs(JSON.parse(notifPrefsString));
        }
        
        // Load app preferences
        const appPrefsString = await AsyncStorage.getItem('appPrefs');
        if (appPrefsString) {
          setAppPrefs(JSON.parse(appPrefsString));
        }
        
        // Get stats about data
        await fetchDataStats();
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Save notification preferences when they change
  useEffect(() => {
    const saveNotificationPrefs = async () => {
      try {
        await AsyncStorage.setItem('notificationPrefs', JSON.stringify(notificationPrefs));
      } catch (error) {
        console.error('Error saving notification preferences:', error);
      }
    };
    
    saveNotificationPrefs();
  }, [notificationPrefs]);
  
  // Save app preferences when they change
  useEffect(() => {
    const saveAppPrefs = async () => {
      try {
        await AsyncStorage.setItem('appPrefs', JSON.stringify(appPrefs));
      } catch (error) {
        console.error('Error saving app preferences:', error);
      }
    };
    
    saveAppPrefs();
  }, [appPrefs]);
  
  // Fetch stats about data
  const fetchDataStats = async () => {
    try {
      const db = getFirestore(firebaseApp);
      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(query(productsRef));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let expired = 0;
      
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        const expiryDate = new Date(data.expiryDate);
        if (expiryDate < today) {
          expired++;
        }
      });
      
      setTotalItems(productsSnapshot.size);
      setExpiredItems(expired);
    } catch (error) {
      console.error('Error fetching data stats:', error);
    }
  };
  
  // Request notification permissions
  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notification Permission',
          'Notifications are disabled. You can enable them in your device settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };
  
  // Toggle notifications
  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    
    setNotificationPrefs(prev => ({ ...prev, enabled: value }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Clear all data
  const handleClearAllData = async () => {
    try {
      setIsProcessing(true);
      const db = getFirestore(firebaseApp);
      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(query(productsRef));
      
      // Create a batch operation
      const batch = writeBatch(db);
      
      // Delete all documents
      productsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Commit the batch
      await batch.commit();
      
      // Reset stats
      setTotalItems(0);
      setExpiredItems(0);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClearDataDialog(false);
      Alert.alert('Success', 'All data has been cleared.');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Delete expired items
  const handleDeleteExpired = async () => {
    try {
      setIsProcessing(true);
      const db = getFirestore(firebaseApp);
      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(query(productsRef));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create a batch operation
      const batch = writeBatch(db);
      let deletedCount = 0;
      
      // Delete expired documents
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        const expiryDate = new Date(data.expiryDate);
        
        if (expiryDate < today) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      // Commit the batch if there are items to delete
      if (deletedCount > 0) {
        await batch.commit();
        
        // Update stats
        setTotalItems(prev => prev - deletedCount);
        setExpiredItems(0);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `Deleted ${deletedCount} expired item${deletedCount !== 1 ? 's' : ''}.`);
      } else {
        Alert.alert('Info', 'No expired items to delete.');
      }
      
      setDeleteExpiredDialog(false);
    } catch (error) {
      console.error('Error deleting expired items:', error);
      Alert.alert('Error', 'Failed to delete expired items. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Export data
  const handleExportData = () => {
    // This would implement data export functionality
    // For demonstration purposes, we'll just show an alert
    Alert.alert(
      'Coming Soon',
      'Data export functionality will be available in a future update.'
    );
  };
  
  // Import data
  const handleImportData = () => {
    // This would implement data import functionality
    // For demonstration purposes, we'll just show an alert
    Alert.alert(
      'Coming Soon',
      'Data import functionality will be available in a future update.'
    );
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
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemText}>
              <Text variant="bodyLarge">Enable Notifications</Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Get reminders about expiring food
              </Text>
            </View>
            <PaperSwitch
              value={notificationPrefs.enabled}
              onValueChange={toggleNotifications}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <List.Accordion
            title="Reminder Settings"
            description="Configure when you receive reminders"
            expanded={reminderSettingsExpanded}
            onPress={() => setReminderSettingsExpanded(!reminderSettingsExpanded)}
            style={styles.settingsAccordion}
            titleStyle={styles.accordionTitle}
            descriptionStyle={styles.accordionDescription}
          >
            <View style={styles.settingItem}>
              <View style={styles.settingItemText}>
                <Text variant="bodyLarge">Expiring Soon Reminder</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Get reminded when items are about to expire
                </Text>
              </View>
              <SegmentedButtons
                value={notificationPrefs.expiringSoon.toString()}
                onValueChange={(value) => 
                  setNotificationPrefs(prev => ({ ...prev, expiringSoon: parseInt(value) }))
                }
                buttons={[
                  { value: '3', label: '3d' },
                  { value: '5', label: '5d' },
                  { value: '7', label: '7d' },
                ]}
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemText}>
                <Text variant="bodyLarge">Day Before Expiry</Text>
              </View>
              <PaperSwitch
                value={notificationPrefs.dayBefore}
                onValueChange={(value) => 
                  setNotificationPrefs(prev => ({ ...prev, dayBefore: value }))
                }
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemText}>
                <Text variant="bodyLarge">Day of Expiry</Text>
              </View>
              <PaperSwitch
                value={notificationPrefs.dayOf}
                onValueChange={(value) => 
                  setNotificationPrefs(prev => ({ ...prev, dayOf: value }))
                }
              />
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingItemText}>
                <Text variant="bodyLarge">Expired Items</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Get reminded about expired items
                </Text>
              </View>
              <PaperSwitch
                value={notificationPrefs.expired}
                onValueChange={(value) => 
                  setNotificationPrefs(prev => ({ ...prev, expired: value }))
                }
              />
            </View>
          </List.Accordion>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            App Preferences
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemText}>
              <Text variant="bodyLarge">Theme</Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Set the app appearance
              </Text>
            </View>
            <SegmentedButtons
              value={appPrefs.theme}
              onValueChange={(value) => 
                setAppPrefs(prev => ({ ...prev, theme: value }))
              }
              buttons={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' },
              ]}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemText}>
              <Text variant="bodyLarge">Haptic Feedback</Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Enable vibration on actions
              </Text>
            </View>
            <PaperSwitch
              value={appPrefs.haptics}
              onValueChange={(value) => {
                setAppPrefs(prev => ({ ...prev, haptics: value }));
                if (value) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingItemText}>
              <Text variant="bodyLarge">Collect Analytics</Text>
              <Text variant="bodySmall" style={styles.settingDescription}>
                Help improve the app by sending anonymous usage data
              </Text>
            </View>
            <PaperSwitch
              value={appPrefs.analytics}
              onValueChange={(value) => 
                setAppPrefs(prev => ({ ...prev, analytics: value }))
              }
            />
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Management
          </Text>
          
          <View style={styles.dataStats}>
            <View style={styles.dataStatItem}>
              <Text variant="displaySmall">{totalItems}</Text>
              <Text variant="bodyMedium">Total Items</Text>
            </View>
            <View style={styles.dataStatItem}>
              <Text variant="displaySmall" style={{ color: totalItems > 0 ? theme.colors.error : undefined }}>
                {expiredItems}
              </Text>
              <Text variant="bodyMedium">Expired Items</Text>
            </View>
          </View>
          
          {totalItems > 0 && (
            <View style={styles.dataStatsBar}>
              <ProgressBar 
                progress={expiredItems / totalItems} 
                color={theme.colors.error} 
                style={styles.progressBar} 
              />
              <Text variant="bodySmall" style={styles.dataStatsLabel}>
                {Math.round((expiredItems / totalItems) * 100)}% of items expired
              </Text>
            </View>
          )}
          
          <View style={styles.dataButtons}>
            <Button 
              mode="outlined"
              icon="delete"
              onPress={() => setDeleteExpiredDialog(true)}
              style={styles.dataButton}
              disabled={expiredItems === 0}
            >
              Delete Expired
            </Button>
            <Button 
              mode="outlined"
              icon="trash-can"
              onPress={() => setClearDataDialog(true)}
              style={styles.dataButton}
              disabled={totalItems === 0}
            >
              Clear All
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.dataButtons}>
            <Button 
              mode="outlined"
              icon="cloud-upload"
              onPress={handleExportData}
              style={styles.dataButton}
              disabled={totalItems === 0}
            >
              Export
            </Button>
            <Button 
              mode="outlined"
              icon="cloud-download"
              onPress={handleImportData}
              style={styles.dataButton}
            >
              Import
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      <View style={styles.aboutSection}>
        <Button 
          mode="text"
          onPress={() => Linking.openURL('https://example.com/privacy')}
          style={styles.aboutButton}
        >
          Privacy Policy
        </Button>
        <Button 
          mode="text"
          onPress={() => Linking.openURL('https://example.com/terms')}
          style={styles.aboutButton}
        >
          Terms of Service
        </Button>
        <Button 
          mode="text"
          onPress={() => Linking.openURL('https://example.com/help')}
          style={styles.aboutButton}
        >
          Help & Support
        </Button>
      </View>
      
      {/* Confirmation Dialogs */}
      <Portal>
        <Dialog visible={clearDataDialog} onDismiss={() => setClearDataDialog(false)}>
          <Dialog.Title>Clear All Data</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will permanently delete all your food items and cannot be undone. Are you sure?
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
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={deleteExpiredDialog} onDismiss={() => setDeleteExpiredDialog(false)}>
          <Dialog.Title>Delete Expired Items</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This will permanently delete all expired items ({expiredItems} items). Continue?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteExpiredDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleDeleteExpired} 
              textColor={theme.colors.error}
              loading={isProcessing}
              disabled={isProcessing}
            >
              Delete
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
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingItemText: {
    flex: 1,
  },
  settingDescription: {
    color: "#666",
    marginTop: 2,
  },
  divider: {
    marginVertical: 8,
  },
  settingsAccordion: {
    paddingHorizontal: 0,
  },
  accordionTitle: {
    fontSize: 16,
  },
  accordionDescription: {
    fontSize: 12,
    color: "#666",
  },
  dataStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  dataStatItem: {
    alignItems: "center",
  },
  dataStatsBar: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  dataStatsLabel: {
    textAlign: "right",
    color: "#666",
    marginTop: 4,
  },
  dataButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dataButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  aboutSection: {
    marginVertical: 16,
    alignItems: "center",
  },
  aboutButton: {
    marginVertical: 4,
  },
});
