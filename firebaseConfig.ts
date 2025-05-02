// firebaseConfig.ts
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDqB4JBgoQvRomUEzunZsxjq1-DY6K0NqM",
  authDomain: "barcodescan-c4496.firebaseapp.com",
  databaseURL: "https://barcodescan-c4496-default-rtdb.firebaseio.com",
  projectId: "barcodescan-c4496",
  storageBucket: "barcodescan-c4496.firebasestorage.app",
  messagingSenderId: "944746111667",
  appId: "1:944746111667:web:d1252292ce7228cb0646c6",
  measurementId: "G-5RRRPZFMY8",
};

export const firebaseApp = initializeApp(firebaseConfig);
