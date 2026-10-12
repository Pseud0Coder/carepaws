/**
 * Nearby vets from Google Places (New). Pure functions, so they can be unit tested without Google or Firebase.
 *
 * The API key never leaves the server: the app calls the `nearbyVets` function, which calls Google.
 * Nothing returned by Google is stored (Places terms limit caching), so every search is a fresh call.
 */

/** Greater Hyderabad. Keep in sync with src/lib/hyderabad-areas.json (tests/areas.test.mjs checks). */
export const SERVICE_BOUNDS = { minLat: 17.15, maxLat: 17.75, minLng: 78.1, maxLng: 78.75 };

export const DEFAULT_RADIUS_KM = 8;
export const MAX_RADIUS_KM = 15;

/** What the app receives for each clinic. */
export interface VetPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating?: number;
  ratingCount?: number;
  /** As Indian people dial it, e.g. "040 2345 6789". */
  phone?: string;
  /** E.164, for tel: links. */
  phoneIntl?: string;
  openNow?: boolean;
  /** Opening hours for the week, Monday first. */
  weekHours?: string[];
  /** Page for this place on Google Maps. */
  mapsUrl: string;
  /** Opens turn-by-turn directions in the Maps app. */
  directionsUrl: string;
  /** Google's AI summary of the reviews. Must be shown with its attribution. */
  summary?: { text: string; disclosure: string; reviewsUrl?: string; flagUrl?: string };
}

export class RequestError extends Error {
  constructor(
    public code: "invalid-argument" | "out-of-range",
    message: string
  ) {
    super(message);
  }
}

export function inServiceArea(lat: number, lng: number): boolean {
  return lat >= SERVICE_BOUNDS.minLat && lat <= SERVICE_BOUNDS.maxLat && lng >= SERVICE_BOUNDS.minLng && lng <= SERVICE_BOUNDS.maxLng;
}

/** Checks what the app sent. Anything outside Hyderabad is refused before Google is called (and billed). */
export function parseRequest(data: unknown): { lat: number; lng: number; radiusM: number } {
  const d = (data ?? {}) as Record<string, unknown>;
  const lat = d.lat;
  const lng = d.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RequestError("invalid-argument", "A location is required.");
  }
  if (!inServiceArea(lat, lng)) {
    throw new RequestError("out-of-range", "Vet search covers Hyderabad for now. Pick a Hyderabad neighbourhood instead.");
  }
  const km = typeof d.radiusKm === "number" && Number.isFinite(d.radiusKm) ? d.radiusKm : DEFAULT_RADIUS_KM;
  const radiusM = Math.round(Math.min(Math.max(km, 1), MAX_RADIUS_KM) * 1000);
  return { lat, lng, radiusM };
}

/** Asks only for what the card shows. Review summaries are the most expensive field, and the reason for the call. */
export const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "places.currentOpeningHours.openNow",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.reviewSummary",
].join(",");

export function buildSearchBody(lat: number, lng: number, radiusM: number) {
  return {
    includedTypes: ["veterinary_care"],
    maxResultCount: 20,
    rankPreference: "DISTANCE",
    languageCode: "en",
    regionCode: "IN",
    locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } },
  };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  currentOpeningHours?: { openNow?: boolean };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviewSummary?: {
    text?: { text?: string };
    disclosureText?: { text?: string };
    reviewsUri?: string;
    flagContentUri?: string;
  };
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** Only links that really point at Google are passed on to the app. */
const googleUrl = (v: unknown) => {
  const s = str(v, 1000);
  return s && /^https:\/\/([a-z0-9-]+\.)*(google\.com|goo\.gl|g\.page|maps\.app\.goo\.gl)(\/|$)/i.test(s) ? s : undefined;
};

/** Turns Google's response into clinic cards, nearest first. Clinics that have closed are dropped. */
export function mapPlaces(raw: unknown, origin: { lat: number; lng: number }): VetPlace[] {
  const places = ((raw as { places?: RawPlace[] } | null)?.places ?? []).filter((p) => p && typeof p === "object");
  const out: VetPlace[] = [];
  for (const p of places) {
    const lat = num(p.location?.latitude);
    const lng = num(p.location?.longitude);
    const id = str(p.id, 200);
    const name = str(p.displayName?.text, 120);
    if (!id || !name || lat === undefined || lng === undefined) continue;
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;

    const summaryText = str(p.reviewSummary?.text?.text, 600);
    const place: VetPlace = {
      id,
      name,
      address: str(p.formattedAddress, 200) ?? "",
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      distanceKm: Math.round(haversineKm(origin, { lat, lng }) * 10) / 10,
      mapsUrl: googleUrl(p.googleMapsUri) ?? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(id)}`,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(id)}`,
    };
    const rating = num(p.rating);
    if (rating !== undefined && rating >= 0 && rating <= 5) {
      place.rating = rating;
      const count = num(p.userRatingCount);
      if (count !== undefined) place.ratingCount = Math.max(0, Math.round(count));
    }
    const phone = str(p.nationalPhoneNumber, 30);
    const intl = str(p.internationalPhoneNumber, 30)?.replace(/[^\d+]/g, "");
    if (phone) place.phone = phone;
    if (intl && /^\+\d{8,15}$/.test(intl)) place.phoneIntl = intl;
    if (typeof p.currentOpeningHours?.openNow === "boolean") place.openNow = p.currentOpeningHours.openNow;
    const week = p.regularOpeningHours?.weekdayDescriptions;
    if (Array.isArray(week) && week.length === 7 && week.every((w) => typeof w === "string")) place.weekHours = week.map((w) => w.slice(0, 80));
    if (summaryText) {
      place.summary = {
        text: summaryText,
        // Google requires its "Summarized with Gemini" disclosure to be shown with the summary.
        disclosure: str(p.reviewSummary?.disclosureText?.text, 80) ?? "Summarized with Gemini",
        reviewsUrl: googleUrl(p.reviewSummary?.reviewsUri),
        flagUrl: googleUrl(p.reviewSummary?.flagContentUri),
      };
    }
    out.push(place);
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** "2026-10-12T09" in India time, for hourly rate-limit buckets. */
export function hourBucket(now = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 13);
}
export const dayBucket = (now = new Date()) => hourBucket(now).slice(0, 10);
