"use client";

import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { Coords } from "./geo";

/** A clinic found through Google Maps. Mirrors VetPlace in functions/src/places.ts. */
export interface VetPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating?: number;
  ratingCount?: number;
  phone?: string;
  phoneIntl?: string;
  openNow?: boolean;
  /** Monday first. */
  weekHours?: string[];
  mapsUrl: string;
  directionsUrl: string;
  summary?: { text: string; disclosure: string; reviewsUrl?: string; flagUrl?: string };
}

/** The closest vets and clinics to a point in Hyderabad, from Google Maps, nearest first. */
export async function findNearbyVets(at: Coords, radiusKm = 8): Promise<VetPlace[]> {
  const call = httpsCallable<{ lat: number; lng: number; radiusKm: number }, { vets: VetPlace[] }>(functions(), "nearbyVets");
  try {
    return (await call({ lat: at.lat, lng: at.lng, radiusKm })).data.vets;
  } catch (e) {
    // The server's messages are written for people ("Vet search covers Hyderabad for now…").
    const err = e as { code?: string; message?: string };
    if (err.code === "functions/unavailable" || err.code === "functions/internal") {
      throw new Error("Vet search isn't available right now. Please try again, or call a clinic you know.");
    }
    throw new Error(err.message || "Couldn't search for vets. Check your connection and try again.");
  }
}

/** Today's opening hours from Google's Monday-first list, e.g. "9 am – 9 pm". */
export function todaysHours(weekHours: string[] | undefined, now = new Date()): string | null {
  if (!weekHours || weekHours.length !== 7) return null;
  const line = weekHours[(now.getDay() + 6) % 7];
  const i = line.indexOf(":");
  return i >= 0 ? line.slice(i + 1).trim() : line;
}
