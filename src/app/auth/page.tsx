"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, PawPrint, Smartphone } from "lucide-react";
import { authErrorMessage, useAuth } from "@/lib/auth-context";
import PhoneOtp from "@/components/PhoneOtp";
import { AppBar, Button, ErrorNote, Field, Input, useToast } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";
type Method = "choose" | "phone" | "email";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function AuthScreen() {
  const { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [method, setMethod] = useState<Method>("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");

  // Only allow in-app relative paths as a post-login destination.
  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  useEffect(() => {
    if (loading || !user || !profile) return;
    router.replace(profile.onboarded ? next : "/onboarding/");
  }, [loading, user, profile, next, router]);

  async function google() {
    setError("");
    setBusy("google");
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("email");
    try {
      if (mode === "signin") await signInWithEmail(email, password);
      else if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Please tell us your name.");
        await signUpWithEmail(email, password, name.trim());
      } else {
        await resetPassword(email);
        toast("Check your inbox for a reset link.");
        setMode("signin");
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    signin: ["Welcome back", "Sign in to see your stays and messages."],
    signup: ["Join CarePaws", "Find a sitter you trust, or become one."],
    reset: ["Reset password", "We’ll email you a link to set a new one."],
  };
  const heading =
    method === "phone" ? ["Your mobile number", "We’ll text you a code. No password to remember."] : method === "email" ? titles[mode] : ["Welcome to CarePaws", "Sign in or create an account in a few seconds."];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar back={method === "choose" ? true : undefined} title={method === "choose" ? undefined : <button onClick={() => setMethod("choose")} className="text-sm font-semibold text-moss">← All options</button>} transparent />
      <main className="flex flex-1 flex-col px-6 pb-10">
        <div className="mt-2 mb-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss text-on-moss shadow-soft">
            <PawPrint className="h-7 w-7" />
          </div>
          <h1 className="font-display text-[32px] leading-tight text-bark">{heading[0]}</h1>
          <p className="mt-2 text-bark-soft">{heading[1]}</p>
        </div>

        {method === "choose" && (
          <div className="space-y-3">
            <Button size="lg" block onClick={() => setMethod("phone")}>
              <Smartphone className="h-5 w-5" /> Continue with phone
            </Button>
            <Button variant="secondary" size="lg" block onClick={google} loading={busy === "google"} disabled={!!busy}>
              {busy !== "google" && <GoogleMark />}
              Continue with Google
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => setMethod("email")} disabled={!!busy}>
              <Mail className="h-5 w-5" /> Continue with email
            </Button>
            <ErrorNote>{error}</ErrorNote>
            <div className="pt-5 text-center">
              <Link href="/" className="text-sm font-semibold text-moss">
                Just looking around? Browse without an account →
              </Link>
            </div>
          </div>
        )}

        {method === "phone" && <PhoneOtp mode="signin" onDone={() => undefined} submitLabel="Verify and continue" />}

        {method === "email" && (
          <>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <Field label="Your name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                </Field>
              )}
              <Field label="Email">
                <Input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </Field>
              {mode !== "reset" && (
                <Field label="Password" hint={mode === "signup" ? "At least 6 characters." : undefined}>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    minLength={6}
                    required
                  />
                </Field>
              )}
              <ErrorNote>{error}</ErrorNote>
              <Button type="submit" size="lg" block loading={busy === "email"} disabled={!!busy}>
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm text-bark-soft">
              {mode === "signin" && (
                <>
                  <button className="font-semibold text-moss" onClick={() => setMode("reset")}>
                    Forgot password?
                  </button>
                  <p>
                    New here?{" "}
                    <button className="font-semibold text-moss" onClick={() => setMode("signup")}>
                      Create an account
                    </button>
                  </p>
                </>
              )}
              {mode !== "signin" && (
                <p>
                  Already have an account?{" "}
                  <button className="font-semibold text-moss" onClick={() => setMode("signin")}>
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
