import { View, StyleSheet } from "react-native";
import { Text, Appbar } from "react-native-paper";
import { CalendarList, DateObject } from "react-native-calendars";
import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { firebaseApp } from "../firebaseConfig";

export default function CalendarScreen() {
  const [markedDates, setMarkedDates] = useState<any>({});
  useEffect(() => {
    const fetchExpiries = async () => {
      const db = getFirestore(firebaseApp);
      const querySnapshot = await getDocs(collection(db, "products"));
      const marks: any = {};
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.expiryDate) {
          marks[d.expiryDate] = {
            marked: true,
            dotColor:
              new Date(d.expiryDate) <
              new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                ? "red"
                : "orange",
            activeOpacity: 0,
          };
        }
      });
      setMarkedDates(marks);
    };
    fetchExpiries();
  }, []);
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Calendar" />
      </Appbar.Header>
      <CalendarList
        markedDates={markedDates}
        markingType={"dot"}
        style={{ margin: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
