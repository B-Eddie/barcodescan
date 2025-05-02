import { View, StyleSheet } from "react-native";
import { Text, Appbar, TextInput, Button } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { getFirestore, setDoc, doc } from "firebase/firestore";
import { firebaseApp } from "../firebaseConfig";

export default function ManualEntryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [barcode, setBarcode] = useState(params.barcode || "");
  const [name, setName] = useState(params.name || "");
  const [expiryDate, setExpiryDate] = useState(params.expiryDate || "");
  const [imageUrl, setImageUrl] = useState(params.imageUrl || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!barcode || !name || !expiryDate) return;
    setSaving(true);
    try {
      const db = getFirestore(firebaseApp);
      await setDoc(doc(db, "products", barcode), {
        name,
        expiryDate,
        imageUrl,
      });
      router.push({
        pathname: "/product-detail",
        params: { barcode, name, expiryDate, imageUrl },
      });
    } catch (e) {
      alert("Failed to save product. Try again.");
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Manual Entry" />
      </Appbar.Header>
      <View style={{ padding: 16 }}>
        <TextInput
          label="Barcode"
          value={barcode}
          onChangeText={setBarcode}
          style={{ marginBottom: 8 }}
        />
        <TextInput
          label="Product Name"
          value={name}
          onChangeText={setName}
          style={{ marginBottom: 8 }}
        />
        <TextInput
          label="Expiry Date (YYYY-MM-DD)"
          value={expiryDate}
          onChangeText={setExpiryDate}
          style={{ marginBottom: 8 }}
        />
        <TextInput
          label="Image URL (optional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          style={{ marginBottom: 8 }}
        />
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving || !barcode || !name || !expiryDate}
        >
          Save Product
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
