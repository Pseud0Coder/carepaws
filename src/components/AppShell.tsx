"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase";
import { applyNativeTheme } from "@/lib/theme";
import Navbar, { isTabRoute } from "./Navbar";
import { ToastProvider } from "./ui";
import SetupNotice from "./SetupNotice";

/** Paths a signed-in user may visit before finishing onboarding. */
const PRE_ONBOARDING = ["/onboarding", "/auth"];

function OnboardingGate() {
  const { profile, loading } = useAuth();
  const path = usePathname() || "/";
  const router = useRouter();
  useEffect(() => {
    if (loading || !profile || profile.onboarded) return;
    if (!PRE_ONBOARDING.some((p) => path.startsWith(p))) router.replace("/onboarding/");
  }, [loading, profile, path, router]);
  return null;
}

function NativeBridge() {
  const router = useRouter();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    applyNativeTheme();
    let remove: (() => void) | undefined;
    import("@capacitor/app").then(({ App }) => {
      const handle = App.addListener("backButton", ({ canGoBack }) => {
        const path = window.location.pathname;
        if (path === "/" || !canGoBack) App.minimizeApp();
        else router.back();
      });
      remove = () => void handle.then((h) => h.remove());
    });
    import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());
    return () => remove?.();
  }, [router]);
  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  if (!isFirebaseConfigured) return <SetupNotice />;
  return (
    <ToastProvider>
      <AuthProvider>
        <NativeBridge />
        <OnboardingGate />
        <div className={isTabRoute(path) ? "relative pb-24" : "relative"}>
          <div className="mx-auto min-h-dvh max-w-lg">{children}</div>
        </div>
        <Navbar />
      </AuthProvider>
    </ToastProvider>
  );
}
