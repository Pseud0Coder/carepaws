"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function AuthPage() {
  const router = useRouter();
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, profile } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // If already logged in and onboarded, redirect
  if (profile?.onboarded) {
    router.push("/dashboard");
    return null;
  }

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/onboarding");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name);
        router.push("/onboarding");
      } else {
        await signInWithEmail(email, password);
        if (profile?.onboarded) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        msg.includes("auth/email-already-in-use")
          ? "An account with this email already exists."
          : msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password")
          ? "Invalid email or password."
          : msg.includes("auth/weak-password")
          ? "Password must be at least 6 characters."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setError("");
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      setError(msg);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500">
            <PawPrint className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">
            {mode === "login" ? "Welcome back" : "Join CarePaws"}
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            {mode === "login"
              ? "Sign in to manage your bookings and pets"
              : "Create an account to find trusted pet sitters"}
          </p>
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-surface-alt active:scale-[0.98] disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-text-tertiary">or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-11 text-sm text-foreground placeholder:text-text-tertiary focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-error-bg px-3 py-2 text-xs text-error">{error}</p>
          )}

          {mode === "login" && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="text-xs font-medium text-primary-500 hover:text-primary-600"
            >
              {resetSent ? "Reset email sent. Check your inbox." : "Forgot password?"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 py-3 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-text-tertiary">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError("");
            }}
            className="font-medium text-foreground hover:text-primary-500"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
