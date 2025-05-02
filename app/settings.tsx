import { View, StyleSheet } from "react-native";
import { Text, Appbar } from "react-native-paper";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <Text style={{ margin: 16 }}>Settings will be shown here.</Text>
      {/* TODO: Notification preferences, cloud account link */}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
