import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False when the build was made without the NEXT_PUBLIC_FIREBASE_* variables. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/** `npm run dev:emulators` points the app at the local Firebase emulators. */
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;
let _functions: Functions | undefined;

function getApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function auth(): Auth {
  if (_auth) return _auth;
  const a = getApp();
  // Inside the Android WebView there is no popup/redirect flow; Google sign-in
  // goes through the native Credential Manager instead, so skip the resolver.
  _auth = Capacitor.isNativePlatform()
    ? initializeAuth(a, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })
    : getAuth(a);
  if (useEmulators) connectAuthEmulator(_auth, "http://127.0.0.1:9099", { disableWarnings: true });
  return _auth;
}

export function db(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getApp());
  if (useEmulators) connectFirestoreEmulator(_db, "127.0.0.1", 8080);
  return _db;
}

export function storage(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getApp());
  if (useEmulators) connectStorageEmulator(_storage, "127.0.0.1", 9199);
  return _storage;
}

export function functions(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(getApp(), process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "asia-south1");
  if (useEmulators) connectFunctionsEmulator(_functions, "127.0.0.1", 5001);
  return _functions;
}
