import { Stack, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Button, Text, Appbar } from "react-native-paper";
import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { firebaseApp } from "../firebaseConfig";

export default function HomeScreen() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  useEffect(() => {
    const fetchUpcoming = async () => {
      const db = getFirestore(firebaseApp);
      const querySnapshot = await getDocs(collection(db, "products"));
      const now = new Date();
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const items: any[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (
          d.expiryDate &&
          new Date(d.expiryDate) >= now &&
          new Date(d.expiryDate) <= week
        ) {
          items.push(d);
        }
      });
      setUpcoming(
        items.sort(
          (a, b) =>
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        )
      );
    };
    fetchUpcoming();
  }, []);
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Expiry Tracker" />
      </Appbar.Header>
      <Button
        mode="contained"
        onPress={() => router.push("/scan")}
        style={{ margin: 16 }}
      >
        Scan Barcode
      </Button>
      <Text style={{ margin: 16, fontWeight: "bold" }}>
        Upcoming Expiries (Next 7 Days):
      </Text>
      {upcoming.length === 0 ? (
        <Text style={{ margin: 16 }}>No upcoming expiries.</Text>
      ) : (
        upcoming.map((item, idx) => (
          <View
            key={idx}
            style={{
              marginHorizontal: 16,
              marginBottom: 8,
              padding: 8,
              backgroundColor: "#fffbe6",
              borderRadius: 8,
              borderLeftWidth: 4,
              borderLeftColor:
                new Date(item.expiryDate) <
                new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                  ? "red"
                  : "orange",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
            <Text>Expires: {item.expiryDate}</Text>
          </View>
        ))
      )}
      <Button onPress={() => router.push("/calendar")}>Calendar View</Button>
      <Button onPress={() => router.push("/manual-entry")}>Manual Entry</Button>
      <Button onPress={() => router.push("/settings")}>Settings</Button>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
