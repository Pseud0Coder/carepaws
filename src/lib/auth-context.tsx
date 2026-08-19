"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export type UserRole = "parent" | "sitter" | null;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  onboarded: boolean;
  phone?: string;
  location?: string;
  bio?: string;
  gender?: "male" | "female";
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: UserRole) => void;
  completeOnboarding: () => void;
  updateProfileData: (data: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Firestore-backed profile operations
async function fetchProfile(uid: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/users?uid=${uid}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.uid) return null;
    return {
      uid: data.uid,
      email: data.email || "",
      displayName: data.displayName || "",
      photoURL: data.photoURL || null,
      role: data.role || null,
      onboarded: data.onboarded || false,
      phone: data.phone,
      location: data.location,
      bio: data.bio,
      gender: data.gender,
    };
  } catch {
    return null;
  }
}

async function saveProfile(profile: UserProfile) {
  try {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
  } catch (e) {
    console.error("Failed to save profile:", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const fetched = await fetchProfile(user.uid);
    if (fetched) setProfile(fetched);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let existing = await fetchProfile(firebaseUser.uid);
        if (!existing) {
          existing = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL,
            role: null,
            onboarded: false,
          };
          await saveProfile(existing);
        }
        setProfile(existing);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);



  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    let existing = await fetchProfile(result.user.uid);
    if (!existing) {
      existing = {
        uid: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        photoURL: result.user.photoURL,
        role: null,
        onboarded: false,
      };
      await saveProfile(existing);
    }
    setProfile(existing);
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const newProfile: UserProfile = {
      uid: result.user.uid,
      email,
      displayName: name,
      photoURL: null,
      role: null,
      onboarded: false,
    };
    await saveProfile(newProfile);
    setProfile(newProfile);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const setRole = (role: UserRole) => {
    if (profile) {
      const updated = { ...profile, role };
      setProfile(updated);
      saveProfile(updated);
    }
  };

  const completeOnboarding = () => {
    if (profile) {
      const updated = { ...profile, onboarded: true };
      setProfile(updated);
      saveProfile(updated);
    }
  };

  const updateProfileData = (data: Partial<UserProfile>) => {
    if (profile) {
      const updated = { ...profile, ...data };
      setProfile(updated);
      saveProfile(updated);
    }
  };

  const authFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    if (!user) throw new Error("Not authenticated");
    const token = await user.getIdToken();
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        signOut,
        setRole,
        completeOnboarding,
        updateProfileData,
        refreshProfile,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
