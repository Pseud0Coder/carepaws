"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth, isFirebaseConfigured } from "./firebase";
import { ensureProfile, getProfile, updateProfile, type EditableProfile } from "./db";
import type { UserProfile } from "./types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (data: Partial<EditableProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** The verified phone number on the signed-in account, if any. */
  phoneNumber: string | null;
  /** Reloads the Firebase user and its token (call after linking a phone number). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

let nativeGoogleReady: Promise<void> | null = null;
async function nativeGoogle() {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  if (!nativeGoogleReady) {
    if (!WEB_CLIENT_ID) throw new Error("Google sign-in is not configured (NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID).");
    nativeGoogleReady = SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } });
  }
  await nativeGoogleReady;
  return SocialLogin;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      setPhoneNumber(u?.phoneNumber ?? null);
      if (u) {
        try {
          setProfile(await ensureProfile(u));
        } catch (e) {
          console.error("Could not load profile", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const u = auth().currentUser;
    if (u) setProfile(await getProfile(u.uid));
  }, []);

  const refreshUser = useCallback(async () => {
    const u = auth().currentUser;
    if (!u) return;
    await u.reload();
    // Security rules read the phone number from the ID token, so force a fresh one.
    await u.getIdToken(true);
    setPhoneNumber(u.phoneNumber ?? null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const SocialLogin = await nativeGoogle();
      const res = await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"] } });
      const idToken = res.result && "idToken" in res.result ? res.result.idToken : null;
      if (!idToken) throw new Error("Google did not return an ID token.");
      await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken));
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth(), provider);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth(), email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const res = await createUserWithEmailAndPassword(auth(), email, password);
    await fbUpdateProfile(res.user, { displayName: name });
    // onAuthStateChanged fired before the display name existed; write it now.
    const p = await ensureProfile({ ...res.user, displayName: name });
    if (p.displayName !== name) await updateProfile(res.user.uid, { displayName: name });
    setProfile({ ...p, displayName: name });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth(), email);
  }, []);

  const signOut = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const SocialLogin = await nativeGoogle();
        await SocialLogin.logout({ provider: "google" });
      } catch {
        /* not signed in with Google */
      }
    }
    await fbSignOut(auth());
  }, []);

  const saveProfile = useCallback(
    async (data: Partial<EditableProfile>) => {
      if (!user) throw new Error("Not signed in");
      await updateProfile(user.uid, data);
      setProfile((p) => (p ? { ...p, ...data } : p));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        signOut,
        saveProfile,
        refreshProfile,
        phoneNumber,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Turns Firebase error codes into sentences a person can act on. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "That email and password don't match.",
    "auth/wrong-password": "That email and password don't match.",
    "auth/user-not-found": "No account with that email yet.",
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/weak-password": "Use at least 6 characters for your password.",
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/network-request-failed": "No connection. Check your internet and try again.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
  };
  if (map[code]) return map[code];
  const msg = (e as Error)?.message || "";
  if (/cancel/i.test(msg)) return "Sign-in was cancelled.";
  return msg || "Something went wrong. Please try again.";
}
