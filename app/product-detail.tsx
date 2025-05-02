import { View, StyleSheet, Image } from "react-native";
import { Text, Button, Appbar, TextInput } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import * as Calendar from "expo-calendar";
import * as Notifications from "expo-notifications";

export default function ProductDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");

  const handleAddToCalendar = async () => {
    setAdding(true);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") throw new Error("Calendar permission denied");
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((c) => c.allowsModifications) || calendars[0];
      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: `${params.name} expires`,
        startDate: new Date(params.expiryDate),
        endDate: new Date(params.expiryDate),
        notes: note || `Barcode: ${params.barcode}`,
      });
      // Schedule notification 3 days before expiry
      const expiry = new Date(params.expiryDate);
      const notifDate = new Date(expiry.getTime() - 3 * 24 * 60 * 60 * 1000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Expiry Reminder: ${params.name}`,
          body: `Expires on ${params.expiryDate}`,
        },
        trigger: notifDate > new Date() ? notifDate : null,
      });
      alert("Added to calendar and reminder set!");
      router.push("/");
    } catch (e) {
      alert("Failed to add to calendar or set reminder.");
    }
    setAdding(false);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Product Details" />
      </Appbar.Header>
      <View style={{ alignItems: "center", padding: 16 }}>
        {params.imageUrl ? (
          <Image
            source={{ uri: params.imageUrl }}
            style={{
              width: 120,
              height: 120,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />
        ) : null}
        <Text variant="titleLarge" style={{ marginBottom: 4 }}>
          {params.name}
        </Text>
        <Text>Barcode: {params.barcode}</Text>
        <Text>Expiry Date: {params.expiryDate}</Text>
        <TextInput
          label="Notes"
          value={note}
          onChangeText={setNote}
          style={{ marginVertical: 8, width: "100%" }}
        />
        <Button
          mode="contained"
          onPress={handleAddToCalendar}
          loading={adding}
          style={{ margin: 8 }}
        >
          Add to Calendar
        </Button>
        <Button
          style={{ margin: 8 }}
          onPress={() => router.push({ pathname: "/manual-entry", params })}
        >
          Edit Date
        </Button>
        <Button style={{ margin: 8 }} onPress={() => router.push("/")}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
