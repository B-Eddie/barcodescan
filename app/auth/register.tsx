import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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
  HelperText,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { register, loading } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form validation
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const validateForm = () => {
    let isValid = true;
    
    // Validate name
    if (!name.trim()) {
      setNameError("Name is required");
      isValid = false;
    } else {
      setNameError("");
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }
    
    // Validate password
    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    } else {
      setPasswordError("");
    }
    
    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    } else {
      setConfirmPasswordError("");
    }
    
    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    Keyboard.dismiss();
    setIsRegistering(true);

    try {
      const user = await register(email, password, name);
      if (user) {
        Alert.alert(
          "Registration Successful",
          "Your account has been created!",
          [
            {
              text: "OK",
              onPress: () => router.replace("/"),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsRegistering(false);
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
            Create Account
          </Text>
        </Surface>

        <View style={styles.formContainer}>
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            disabled={isRegistering}
            left={<TextInput.Icon icon="account" />}
            error={!!nameError}
          />
          {nameError ? <HelperText type="error">{nameError}</HelperText> : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            disabled={isRegistering}
            left={<TextInput.Icon icon="email" />}
            error={!!emailError}
          />
          {emailError ? <HelperText type="error">{emailError}</HelperText> : null}

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            disabled={isRegistering}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            error={!!passwordError}
          />
          {passwordError ? <HelperText type="error">{passwordError}</HelperText> : null}

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            disabled={isRegistering}
            left={<TextInput.Icon icon="lock-check" />}
            error={!!confirmPasswordError}
          />
          {confirmPasswordError ? <HelperText type="error">{confirmPasswordError}</HelperText> : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.button}
            disabled={isRegistering || loading}
            loading={isRegistering}
          >
            Sign Up
          </Button>

          <View style={styles.loginContainer}>
            <Text variant="bodyMedium">Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity disabled={isRegistering}>
                <Text
                  style={{ color: theme.colors.primary, fontWeight: "bold" }}
                >
                  Login
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
    marginBottom: 4,
  },
  button: {
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
}); 