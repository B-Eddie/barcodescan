import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, onAuthStateChanged } from "firebase/auth";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import {
  auth,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "../firebaseConfig";

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<User | null>;
  logOut: () => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User | null>;
  forgotPassword: (email: string) => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logIn: async () => null,
  logOut: async () => {},
  register: async () => null,
  forgotPassword: async () => {},
});

// Create provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for stored user data on mount
  useEffect(() => {
    const checkStoredUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Error checking stored user:", error);
      } finally {
        setLoading(false);
      }
    };

    checkStoredUser();
  }, []);

  // Set up auth state listener
  useEffect(() => {
    let mounted = true;

    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await AsyncStorage.setItem("user", JSON.stringify(currentUser));
          } else {
            await AsyncStorage.removeItem("user");
          }
          setLoading(false);
        }
      });

      // Clean up subscription
      return () => {
        mounted = false;
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up auth state listener:", error);
      if (mounted) {
        setLoading(false);
      }
    }
  }, []);

  // Authentication methods
  const logIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const user = await signIn(email, password);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Login Error", error.message);
      } else {
        Alert.alert("Login Error", "An unknown error occurred.");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    try {
      setLoading(true);
      await signOut();
      await AsyncStorage.removeItem("user");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Logout Error", error.message);
      } else {
        Alert.alert("Logout Error", "An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      setLoading(true);
      const user = await signUp(email, password, displayName);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Registration Error", error.message);
      } else {
        Alert.alert("Registration Error", "An unknown error occurred.");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert("Success", "Password reset email sent!");
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Password Reset Error", error.message);
      } else {
        Alert.alert("Password Reset Error", "An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    logIn,
    logOut,
    register,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
