// firebaseConfig.ts
import { FirebaseApp, getApps, initializeApp, FirebaseOptions } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDqB4JBgoQvRomUEzunZsxjq1-DY6K0NqM",
  authDomain: "barcodescan-c4496.firebaseapp.com",
  databaseURL: "https://barcodescan-c4496-default-rtdb.firebaseio.com",
  projectId: "barcodescan-c4496",
  storageBucket: "barcodescan-c4496.firebasestorage.app",
  messagingSenderId: "944746111667",
  appId: "1:944746111667:web:d1252292ce7228cb0646c6",
  measurementId: "G-5RRRPZFMY8"
};

let firebaseApp: FirebaseApp;

// Initialize Firebase with error handling
try {
  if (!getApps().length) {
    console.log("Initializing Firebase...");
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    console.log("Firebase already initialized");
    firebaseApp = getApps()[0];
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  // Fallback initialization with minimal config if possible
  const minimalConfig = {
    apiKey: firebaseConfig.apiKey,
    projectId: firebaseConfig.projectId,
  };
  
  if (!getApps().length) {
    firebaseApp = initializeApp(minimalConfig);
  } else {
    firebaseApp = getApps()[0];
  }
}

// Initialize Firestore with enhanced persistence settings
export const db = getFirestore(firebaseApp);

// Enable offline persistence with more robust error handling
try {
  // Enable indexedDB persistence for offline capability with larger cache
  enableIndexedDbPersistence(db, {
    forceOwnership: true
  }).then(() => {
    console.log("Firestore persistence enabled");
  }).catch((error) => {
    if (error.code === 'failed-precondition') {
      console.warn("Firestore persistence could not be enabled (multiple tabs open)");
    } else if (error.code === 'unimplemented') {
      console.warn("Firestore persistence not supported by this browser");
    } else {
      console.error("Firestore persistence error:", error);
    }
  });
} catch (error) {
  console.error("Error initializing Firestore settings:", error);
}

export { firebaseApp };
