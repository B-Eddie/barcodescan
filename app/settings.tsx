import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, List, Switch, Text, useTheme } from "react-native-paper";

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoScan, setAutoScan] = useState(true);

  const handleLogout = () => {
    // TODO: Implement Firebase logout
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Settings
          </Text>

          <List.Section>
            <List.Subheader>Preferences</List.Subheader>
            <List.Item
              title="Notifications"
              description="Get reminders about expiring items"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
            />
            <List.Item
              title="Dark Mode"
              description="Toggle dark theme"
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch value={darkMode} onValueChange={setDarkMode} />
              )}
            />
            <List.Item
              title="Auto Scan"
              description="Automatically scan when camera opens"
              left={(props) => <List.Icon {...props} icon="camera" />}
              right={() => (
                <Switch value={autoScan} onValueChange={setAutoScan} />
              )}
            />
          </List.Section>

          <List.Section>
            <List.Subheader>Account</List.Subheader>
            <List.Item
              title="Profile"
              description="View and edit your profile"
              left={(props) => <List.Icon {...props} icon="account" />}
              onPress={() => {}}
            />
            <List.Item
              title="Privacy"
              description="Manage your privacy settings"
              left={(props) => <List.Icon {...props} icon="shield-account" />}
              onPress={() => {}}
            />
          </List.Section>

          <List.Section>
            <List.Subheader>About</List.Subheader>
            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <List.Item
              title="Terms of Service"
              left={(props) => <List.Icon {...props} icon="file-document" />}
              onPress={() => {}}
            />
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield" />}
              onPress={() => {}}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor={theme.colors.error}
      >
        Log Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
  },
  logoutButton: {
    borderColor: "#ff4444",
  },
});
