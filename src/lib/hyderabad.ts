import data from "./hyderabad-areas.json";

/**
 * CarePaws is launching in Hyderabad first. People pick a neighbourhood rather than share a precise
 * address, and distances are measured from the neighbourhood's approximate centre.
 */
export const HYD_AREAS: readonly { name: string; lat: number; lng: number }[] = data.areas;
export const HYD_BOUNDS = data.bounds;
export const HYD_CITY = "Hyderabad";

export const isHydArea = (name: string | undefined | null): boolean => !!name && HYD_AREAS.some((a) => a.name === name);
export const areaCentre = (name: string | undefined | null) => HYD_AREAS.find((a) => a.name === name) ?? null;

/** "Gachibowli, Hyderabad": the line shown on profiles. */
export const locationLabel = (area: string) => `${area}, ${HYD_CITY}`;

/** True if a point lies inside the greater Hyderabad service area. */
export function inHyderabad(lat: number, lng: number): boolean {
  return lat >= HYD_BOUNDS.minLat && lat <= HYD_BOUNDS.maxLat && lng >= HYD_BOUNDS.minLng && lng <= HYD_BOUNDS.maxLng;
}

/** Hyderabad and Ranga Reddy / Medchal / Sangareddy pincodes all start 500, 501 or 502. */
export const HYD_PINCODE = /^50[0-2]\d{3}$/;
