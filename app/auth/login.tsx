import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  Button,
  TextInput,
  Text,
  useTheme,
  Surface,
  ActivityIndicator,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { logIn, forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    Keyboard.dismiss();
    setIsLoggingIn(true);

    try {
      const user = await logIn(email, password);
      if (user) {
        router.replace("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    try {
      await forgotPassword(email);
    } catch (error) {
      console.error("Password reset error:", error);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Surface style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="fridge-outline"
            size={80}
            color={theme.colors.primary}
          />
          <Text variant="headlineMedium" style={styles.title}>
            Food Expiry Tracker
          </Text>
        </Surface>

        <View style={styles.formContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            disabled={isLoggingIn}
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            disabled={isLoggingIn}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
            disabled={isLoggingIn}
          >
            <Text style={[styles.forgotPassword, { color: theme.colors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            disabled={isLoggingIn || loading}
            loading={isLoggingIn}
          >
            Login
          </Button>

          <View style={styles.signupContainer}>
            <Text variant="bodyMedium">Don't have an account? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity disabled={isLoggingIn}>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: "bold" }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    marginBottom: 32,
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    marginTop: 16,
    fontWeight: "bold",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  forgotPassword: {
    fontSize: 14,
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
}); 