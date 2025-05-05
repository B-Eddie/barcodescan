// firebaseConfig.ts
import { getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  initializeAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { Database, get, getDatabase, ref, set } from 'firebase/database';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDqB4JBgoQvRomUEzunZsxjq1-DY6K0NqM",
  authDomain: "barcodescan-c4496.firebaseapp.com",
  databaseURL: "https://barcodescan-c4496-default-rtdb.firebaseio.com",
  projectId: "barcodescan-c4496",
  storageBucket: "barcodescan-c4496.firebasestorage.app",
  messagingSenderId: "944746111667",
  appId: "1:944746111667:web:d1252292ce7228cb0646c6",
  measurementId: "G-5RRRPZFMY8"
};

// Initialize Firebase
let app;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('Using existing Firebase app');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Initialize Auth
let auth: Auth;
try {
  auth = initializeAuth(app);
  console.log('Auth initialized successfully');
} catch (error) {
  console.error('Error initializing Auth:', error);
  throw error;
}

// Initialize Realtime Database
let database: Database;
try {
  database = getDatabase(app);
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Error initializing Database:', error);
  throw error;
}

// Export the instances
export { app, auth, database };

// Auth functions
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

// Database functions
export const getProduct = async (barcode: string) => {
  try {
    const productRef = ref(database, `products/${barcode}`);
    const snapshot = await get(productRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
};

export const saveProduct = async (barcode: string, productData: any) => {
  try {
    const productRef = ref(database, `products/${barcode}`);
    await set(productRef, productData);
    return true;
  } catch (error) {
    console.error('Error saving product:', error);
    throw error;
  }
};
