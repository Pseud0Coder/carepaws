"use client";

import { Capacitor } from "@capacitor/core";

export interface Coords {
  lat: number;
  lng: number;
}

const KEY = "carepaws.location";

/**
 * Current position. Uses the native plugin inside the Android app, the browser API elsewhere.
 * `precise` is for pinning a premises; sorting "nearby" results only needs approximate.
 */
export async function getPosition(precise = false): Promise<Coords> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions({ permissions: [precise ? "location" : "coarseLocation"] });
    if (perm.coarseLocation === "denied" && perm.location === "denied") {
      throw new Error("Location permission was denied. You can search by city instead.");
    }
    const p = await Geolocation.getCurrentPosition({
      enableHighAccuracy: precise,
      timeout: 12000,
      maximumAge: precise ? 0 : 5 * 60 * 1000,
    });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  }
  if (!("geolocation" in navigator)) throw new Error("This device can't share its location.");
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location permission was denied. You can search by city instead."
              : "Couldn't get your location. Try again, or search by city."
          )
        ),
      { enableHighAccuracy: precise, timeout: 12000, maximumAge: precise ? 0 : 5 * 60 * 1000 }
    )
  );
}

export function loadSavedPosition(): Coords | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return v && typeof v.lat === "number" && typeof v.lng === "number" ? v : null;
  } catch {
    return null;
  }
}

export function savePosition(c: Coords | null) {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Great-circle distance in km. */
export function distanceKm(a: Coords, b: Coords): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 10) * 100)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function directionsUrl(o: { lat?: number; lng?: number; address?: string; location?: string; displayName?: string }) {
  if (typeof o.lat === "number" && typeof o.lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`;
  }
  const q = [o.displayName, o.address, o.location].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** `tel:` link that survives spaces and punctuation in a stored number. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
