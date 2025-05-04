import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signIn, signOut, signUp, resetPassword } from '../firebaseConfig';
import { Alert } from 'react-native';

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<User | null>;
  logOut: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<User | null>;
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
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  // Authentication methods
  const logIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const user = await signIn(email, password);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Login Error', error.message);
      } else {
        Alert.alert('Login Error', 'An unknown error occurred.');
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
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Logout Error', error.message);
      } else {
        Alert.alert('Logout Error', 'An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      const user = await signUp(email, password, displayName);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Registration Error', error.message);
      } else {
        Alert.alert('Registration Error', 'An unknown error occurred.');
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
      Alert.alert('Password Reset', 'Check your email for password reset instructions.');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Password Reset Error', error.message);
      } else {
        Alert.alert('Password Reset Error', 'An unknown error occurred.');
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
};

// Custom hook for using the auth context
export const useAuth = () => useContext(AuthContext); 