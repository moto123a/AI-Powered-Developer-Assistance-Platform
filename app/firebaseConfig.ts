// app/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Credentials prefer NEXT_PUBLIC_* env vars (set on your server/CI).
// Firebase client config is a public identifier — security is enforced by
// Firebase Security Rules and the server-side Admin SDK, not by keeping
// these values secret.
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY             || "AIzaSyAGGmuFpR0qkCHLI3q2cPv_o3cQlbIU8lE",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         || "copilotx-ai.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID          || "copilotx-ai",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET      || "copilotx-ai.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "442817370861",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID              || "1:442817370861:web:7ad73b592a1680db5f0ae4",
};

// ✅ Initialize app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app); // 2. Added this line to initialize Firestore
export { app };