"use client";

import { Capacitor } from "@capacitor/core";

export type ThemePref = "light" | "dark" | "system";

export function getThemePref(): ThemePref {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  } catch {
    /* storage unavailable */
  }
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  applyNativeTheme();
}

/** Matches the Android status bar to the current theme. */
export async function applyNativeTheme() {
  if (!Capacitor.isNativePlatform()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const dark = document.documentElement.classList.contains("dark");
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  await StatusBar.setBackgroundColor({ color: dark ? "#171512" : "#f3eee5" }).catch(() => {});
}
