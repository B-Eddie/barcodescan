import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card, Divider, Switch, Text } from "react-native-paper";
import AppLayout from "../components/AppLayout";
import { Colors, SafeArea, Shadows, Spacing } from "../constants/designSystem";
import { auth } from "../firebaseConfig";

interface SettingItem {
  icon: string;
  title: string;
  subtitle?: string;
  type: "switch" | "action" | "navigation";
  value?: boolean;
  onPress?: () => void;
  color?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start animations on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/auth/login");
          } catch (error) {
            console.error("Error signing out:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleExportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Export Data",
      "This feature will export your food data to a CSV file.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Export", onPress: () => console.log("Export data") },
      ]
    );
  };

  const handleImportData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Import Data",
      "This feature will import food data from a CSV file.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import", onPress: () => console.log("Import data") },
      ]
    );
  };

  const handleBackupData = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Backup Data",
      "Your data is automatically backed up to Firebase. This will create an additional local backup.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create Backup", onPress: () => console.log("Backup data") },
      ]
    );
  };

  const settingSections = [
    {
      title: "Notifications",
      items: [
        {
          icon: "bell",
          title: "Push Notifications",
          subtitle: "Get notified about expiring items",
          type: "switch" as const,
          value: notificationsEnabled,
          onPress: () => {
            setNotificationsEnabled(!notificationsEnabled);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          icon: "volume-high",
          title: "Sound",
          subtitle: "Play sound with notifications",
          type: "switch" as const,
          value: soundEnabled,
          onPress: () => {
            setSoundEnabled(!soundEnabled);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ],
    },
    {
      title: "Data Management",
      items: [
        {
          icon: "backup-restore",
          title: "Auto Backup",
          subtitle: "Automatically backup data weekly",
          type: "switch" as const,
          value: autoBackup,
          onPress: () => {
            setAutoBackup(!autoBackup);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
        {
          icon: "cloud-upload",
          title: "Create Backup",
          subtitle: "Manually backup your data",
          type: "action" as const,
          onPress: handleBackupData,
        },
        {
          icon: "export",
          title: "Export Data",
          subtitle: "Export to CSV file",
          type: "action" as const,
          onPress: handleExportData,
        },
        {
          icon: "import",
          title: "Import Data",
          subtitle: "Import from CSV file",
          type: "action" as const,
          onPress: handleImportData,
        },
      ],
    },
    {
      title: "App Information",
      items: [
        {
          icon: "information",
          title: "About",
          subtitle: "App version and information",
          type: "navigation" as const,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Food Expiry Tracker",
              "Version 1.0.0\n\nTrack your food expiration dates with barcode scanning and smart notifications.",
              [{ text: "OK" }]
            );
          },
        },
        {
          icon: "help-circle",
          title: "Help & Support",
          subtitle: "Get help using the app",
          type: "navigation" as const,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Help & Support",
              "For support, please contact:\nsupport@foodtracker.app",
              [{ text: "OK" }]
            );
          },
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number) => {
    const animatedValue = new Animated.Value(0);

    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View
        key={item.title}
        style={[
          {
            opacity: animatedValue,
            transform: [
              {
                translateX: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.settingItem}
          onPress={item.onPress}
          activeOpacity={0.7}
          disabled={item.type === "switch"}
        >
          <View style={styles.settingContent}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: item.color
                      ? `${item.color}20`
                      : Colors.primary50,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={22}
                  color={item.color || Colors.primary500}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                )}
              </View>
            </View>

            <View style={styles.settingRight}>
              {item.type === "switch" && (
                <Switch
                  value={item.value}
                  onValueChange={item.onPress}
                  trackColor={{
                    false: Colors.gray300,
                    true: Colors.primary200,
                  }}
                  thumbColor={item.value ? Colors.primary500 : Colors.gray500}
                />
              )}
              {item.type === "navigation" && (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.gray400}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSection = (section: any, sectionIndex: number) => (
    <Animated.View
      key={section.title}
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 30],
                outputRange: [0, 30],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Card style={styles.sectionCard}>
        {section.items.map((item: SettingItem, index: number) => (
          <View key={item.title}>
            {renderSettingItem(item, sectionIndex * 10 + index)}
            {index < section.items.length - 1 && (
              <Divider style={styles.divider} />
            )}
          </View>
        ))}
      </Card>
    </Animated.View>
  );

  return (
    <AppLayout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </Animated.View>

        {/* User Info */}
        <Animated.View
          style={[
            styles.userSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: fadeAnim }],
            },
          ]}
        >
          <Card style={styles.userCard}>
            <Card.Content style={styles.userContent}>
              <View style={styles.userAvatar}>
                <MaterialCommunityIcons
                  name="account-circle"
                  size={60}
                  color={Colors.primary500}
                />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>
                  {auth.currentUser?.email || "User"}
                </Text>
                <Text style={styles.userStatus}>Account Active</Text>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>

        {/* Settings Sections */}
        {settingSections.map(renderSection)}

        {/* Sign Out Section */}
        <Animated.View
          style={[
            styles.signOutSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Button
            mode="contained"
            onPress={handleSignOut}
            style={styles.signOutButton}
            contentStyle={styles.signOutButtonContent}
            labelStyle={styles.signOutButtonText}
            icon="logout"
            buttonColor={Colors.error}
          >
            Sign Out
          </Button>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: SafeArea.top + Spacing.lg,
    paddingHorizontal: SafeArea.horizontal,
    paddingBottom: Spacing.lg,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },

  headerSubtitle: {
    fontSize: 16,
    color: Colors.gray600,
  },

  userSection: {
    paddingHorizontal: SafeArea.horizontal,
    marginBottom: Spacing.xl,
  },

  userCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.md,
  },

  userContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },

  userAvatar: {
    marginRight: Spacing.lg,
  },

  userInfo: {
    flex: 1,
  },

  userEmail: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },

  userStatus: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: "500",
  },

  section: {
    paddingHorizontal: SafeArea.horizontal,
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray900,
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    ...Shadows.sm,
  },

  settingItem: {
    backgroundColor: Colors.surface,
  },

  settingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },

  settingLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },

  settingText: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.gray900,
    marginBottom: 2,
  },

  settingSubtitle: {
    fontSize: 13,
    color: Colors.gray600,
  },

  settingRight: {
    marginLeft: Spacing.md,
  },

  divider: {
    marginLeft: Spacing.lg + 40 + Spacing.md, // Align with text
    backgroundColor: Colors.gray200,
  },

  signOutSection: {
    paddingHorizontal: SafeArea.horizontal,
    marginBottom: Spacing.xl,
  },

  signOutButton: {
    borderRadius: 12,
    ...Shadows.sm,
  },

  signOutButtonContent: {
    height: 48,
  },

  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
