"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  Menu,
  X,
  PawPrint,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Avatar from "./Avatar";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/sitters", label: "Find Sitters" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/community", label: "Community" },
];

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getThemeServerSnapshot() {
  return false;
}

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-foreground"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
            <PawPrint className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg tracking-tight">CarePaws</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-primary-50 text-primary-600"
                  : "text-text-secondary hover:text-foreground hover:bg-surface-alt"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-alt hover:text-text-secondary"
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-border" />
          ) : profile ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-all hover:bg-surface-alt"
              >
                <Avatar
                  name={profile.displayName}
                  size="sm"
                  gender="female"
                />
                <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                  {profile.displayName.split(" ")[0]}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-text-tertiary transition-transform ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-border bg-surface py-1.5 shadow-lg">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-alt hover:text-foreground"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-alt hover:text-foreground"
                    >
                      My Bookings
                    </Link>
                    <div className="my-1.5 border-t border-border-subtle" />
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error-bg"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-alt md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-primary-50 text-primary-600"
                    : "text-text-secondary hover:bg-surface-alt"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-border-subtle" />

            <button
              onClick={() => {
                toggleTheme();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-text-secondary hover:bg-surface-alt"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {dark ? "Light Mode" : "Dark Mode"}
            </button>

            {profile ? (
              <button
                onClick={() => {
                  handleSignOut();
                  setMobileOpen(false);
                }}
                className="mt-2 flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-center text-sm font-medium text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg bg-primary-500 px-5 py-3 text-center text-sm font-medium text-white"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
