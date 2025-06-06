import { CameraView } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { analyzeReceipt } from "../services/receiptAnalysis";

type ScreenState = "camera" | "preview" | "processing";

export default function ScanScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [screenState, setScreenState] = useState<ScreenState>("camera");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scanLineAnim] = useState(new Animated.Value(0));
  const [flashMode, setFlashMode] = useState<"on" | "off">("off");
  const [cameraType, setCameraType] = useState<"front" | "back">("back");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { width } = Dimensions.get("window");

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanning]);

  const handleReceiptCapture = async () => {
    try {
      if (!cameraRef.current) return;

      setScanning(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
      });

      setCapturedImage(photo.uri);
      setScreenState("preview");
    } catch (error) {
      console.error("Error capturing receipt:", error);
      Alert.alert("Error", "Failed to capture receipt. Please try again.");
      setScanning(true);
    }
  };

  const handleConfirmImage = async () => {
    try {
      if (!capturedImage) return;

      setScreenState("processing");
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Process the captured receipt image
      const result = await analyzeReceipt(capturedImage);

      // Navigate to receipt analysis screen with the results
      router.push({
        pathname: "/receipt-scan",
        params: {
          imageUri: capturedImage,
          purchaseDate: result.purchaseDate,
          items: JSON.stringify(result.items),
        },
      });
    } catch (error) {
      console.error("Error processing receipt:", error);
      Alert.alert("Error", "Failed to process receipt. Please try again.");
      setScreenState("camera");
      setScanning(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCapturedImage(null);
    setScreenState("camera");
    setScanning(true);
  };

  const handleUploadReceipt = async () => {
    try {
      setLoading(true);
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!pickerResult.canceled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCapturedImage(pickerResult.assets[0].uri);
        setScreenState("preview");
      }
    } catch (error) {
      console.error("Error uploading receipt:", error);
      Alert.alert("Error", "Failed to upload receipt. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode(flashMode === "on" ? "off" : "on");
  };

  const toggleCamera = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraType(cameraType === "back" ? "front" : "back");
  };

  useFocusEffect(
    useCallback(() => {
      // Reset screen when component comes into focus
      setScreenState("camera");
      setScanning(true);
      setCapturedImage(null);
      setLoading(false);
    }, [])
  );

  if (screenState === "processing") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Processing receipt...</Text>
        <Text style={styles.loadingSubtext}>This may take a few moments</Text>
      </View>
    );
  }

  if (screenState === "preview") {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage! }} style={styles.previewImage} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.previewOverlay}
        >
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor="#fff"
              onPress={handleRetake}
            />
            <Text style={styles.headerTitle}>Verify Receipt</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.previewContent}>
            <Text style={styles.previewText}>
              Is this receipt clear and readable?
            </Text>
            <Text style={styles.previewSubtext}>
              Make sure all text is visible and not blurry
            </Text>
          </View>

          <View style={styles.previewControls}>
            <Button
              mode="outlined"
              onPress={handleRetake}
              style={styles.previewButton}
              textColor="#fff"
              icon="camera-retake"
            >
              Retake
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmImage}
              style={styles.previewButton}
              icon="check"
            >
              Looks Good
            </Button>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        flash={flashMode}
        enableTorch={flashMode === "on"}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)"]}
          style={styles.overlay}
        >
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor="#fff"
              onPress={() => router.back()}
            />
            <Text style={styles.headerTitle}>Scan Receipt</Text>
            <IconButton
              icon="upload"
              size={24}
              iconColor="#fff"
              onPress={handleUploadReceipt}
            />
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
            <Text style={styles.scanText}>
              Position the receipt within the frame
            </Text>
          </View>

          <View style={styles.controls}>
            <IconButton
              icon={flashMode === "on" ? "flash" : "flash-off"}
              size={32}
              iconColor="#fff"
              onPress={toggleFlash}
            />
            <Surface style={styles.captureButton} elevation={4}>
              <IconButton
                icon="camera"
                size={32}
                iconColor={theme.colors.primary}
                onPress={handleReceiptCapture}
              />
            </Surface>
            <IconButton
              icon="camera-flip"
              size={32}
              iconColor="#fff"
              onPress={toggleCamera}
            />
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  scanArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: "80%",
    height: 200,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  scanLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#6200ee",
  },
  scanText: {
    color: "#fff",
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 24,
    paddingBottom: 40,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#6200ee",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  previewContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  previewText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  previewSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    textAlign: "center",
  },
  previewControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 24,
    paddingBottom: 40,
  },
  previewButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});
