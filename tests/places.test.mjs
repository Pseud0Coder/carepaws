import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIELD_MASK, RequestError, buildSearchBody, dayBucket, hourBucket, mapPlaces, parseRequest } from "../functions/lib/places.js";

const origin = { lat: 17.4401, lng: 78.3489 }; // Gachibowli

const raw = {
  places: [
    {
      id: "far", displayName: { text: "Far Clinic" }, formattedAddress: "Kukatpally, Hyderabad", location: { latitude: 17.4948, longitude: 78.3996 },
      rating: 4.1, userRatingCount: 88, businessStatus: "OPERATIONAL", googleMapsUri: "https://maps.google.com/?cid=1",
    },
    {
      id: "near", displayName: { text: "Near Vet Hospital" }, formattedAddress: "Gachibowli, Hyderabad 500032", location: { latitude: 17.4412, longitude: 78.3501 },
      rating: 4.6, userRatingCount: 312, nationalPhoneNumber: "040 2345 6789", internationalPhoneNumber: "+91 40 2345 6789",
      businessStatus: "OPERATIONAL", googleMapsUri: "https://maps.google.com/?cid=2",
      currentOpeningHours: { openNow: true },
      regularOpeningHours: { weekdayDescriptions: ["Monday: Open 24 hours", "Tuesday: Open 24 hours", "Wednesday: Open 24 hours", "Thursday: Open 24 hours", "Friday: Open 24 hours", "Saturday: Open 24 hours", "Sunday: Open 24 hours"] },
      reviewSummary: {
        text: { text: "Visitors praise the caring doctors and quick emergency response." },
        disclosureText: { text: "Summarized with Gemini" },
        reviewsUri: "https://www.google.com/maps/place/?q=place_id:near&reviews",
        flagContentUri: "https://www.google.com/local/review/rap/report?id=abc",
      },
    },
    { id: "gone", displayName: { text: "Closed Clinic" }, location: { latitude: 17.44, longitude: 78.35 }, businessStatus: "CLOSED_PERMANENTLY" },
    { id: "nolocation", displayName: { text: "Broken" } },
    { displayName: { text: "No id" }, location: { latitude: 17.44, longitude: 78.35 } },
    {
      id: "evil", displayName: { text: "Odd Links" }, location: { latitude: 17.45, longitude: 78.36 }, googleMapsUri: "javascript:alert(1)",
      reviewSummary: { text: { text: "x" }, reviewsUri: "https://evil.example.com/steal", flagContentUri: "http://www.google.com/insecure" },
    },
  ],
};

test("the request must be a point inside Hyderabad", () => {
  assert.deepEqual(parseRequest({ lat: 17.44, lng: 78.35 }), { lat: 17.44, lng: 78.35, radiusM: 8000 });
  for (const bad of [null, {}, { lat: "17", lng: "78" }, { lat: NaN, lng: 78.3 }, { lat: 17.4 }]) {
    assert.throws(() => parseRequest(bad), (e) => e instanceof RequestError && e.code === "invalid-argument");
  }
  assert.throws(() => parseRequest({ lat: 19.07, lng: 72.87 }), (e) => e instanceof RequestError && e.code === "out-of-range"); // Mumbai
  assert.throws(() => parseRequest({ lat: 12.97, lng: 77.59 }), (e) => e instanceof RequestError && e.code === "out-of-range"); // Bengaluru
});

test("the search radius is clamped", () => {
  assert.equal(parseRequest({ lat: 17.44, lng: 78.35, radiusKm: 500 }).radiusM, 15000);
  assert.equal(parseRequest({ lat: 17.44, lng: 78.35, radiusKm: 0 }).radiusM, 1000);
});

test("the Google request asks for vets, nearest first, in India", () => {
  const b = buildSearchBody(17.44, 78.35, 8000);
  assert.deepEqual(b.includedTypes, ["veterinary_care"]);
  assert.equal(b.rankPreference, "DISTANCE");
  assert.equal(b.regionCode, "IN");
  assert.equal(b.locationRestriction.circle.radius, 8000);
  for (const f of ["places.rating", "places.nationalPhoneNumber", "places.reviewSummary", "places.currentOpeningHours.openNow", "places.googleMapsUri"]) {
    assert.ok(FIELD_MASK.split(",").includes(f), `field mask misses ${f}`);
  }
});

test("clinics come back nearest first, with only operating ones", () => {
  const vets = mapPlaces(raw, origin);
  assert.deepEqual(vets.map((v) => v.id), ["near", "evil", "far"]);
  assert.ok(vets[0].distanceKm < 0.5 && vets[2].distanceKm > 5);
});

test("a card carries rating, contact, opening status and directions", () => {
  const v = mapPlaces(raw, origin)[0];
  assert.equal(v.name, "Near Vet Hospital");
  assert.equal(v.rating, 4.6);
  assert.equal(v.ratingCount, 312);
  assert.equal(v.phone, "040 2345 6789");
  assert.equal(v.phoneIntl, "+914023456789");
  assert.equal(v.openNow, true);
  assert.equal(v.weekHours?.length, 7);
  assert.match(v.directionsUrl, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=17\.4412,78\.3501&destination_place_id=near$/);
});

test("the AI summary keeps its attribution and Google links", () => {
  const s = mapPlaces(raw, origin)[0].summary;
  assert.equal(s.text, "Visitors praise the caring doctors and quick emergency response.");
  assert.equal(s.disclosure, "Summarized with Gemini");
  assert.match(s.reviewsUrl, /^https:\/\/www\.google\.com\//);
  assert.match(s.flagUrl, /^https:\/\/www\.google\.com\//);
});

test("links that don't point at Google are dropped", () => {
  const evil = mapPlaces(raw, origin).find((v) => v.id === "evil");
  assert.match(evil.mapsUrl, /^https:\/\/www\.google\.com\/maps\/search\//); // rebuilt from the coordinates
  assert.equal(evil.summary.reviewsUrl, undefined);
  assert.equal(evil.summary.flagUrl, undefined);
  assert.equal(evil.summary.disclosure, "Summarized with Gemini");
});

test("an empty or odd response gives an empty list, not an error", () => {
  assert.deepEqual(mapPlaces({}, origin), []);
  assert.deepEqual(mapPlaces(null, origin), []);
  assert.deepEqual(mapPlaces({ places: [null, 5, "x"] }, origin), []);
});

test("rate-limit buckets use India time", () => {
  assert.equal(hourBucket(new Date("2026-10-12T18:40:00Z")), "2026-10-13T00"); // 00:10 IST the next day
  assert.equal(dayBucket(new Date("2026-10-12T18:40:00Z")), "2026-10-13");
});

test("the server's service bounds match the app's Hyderabad bounds", () => {
  const json = JSON.parse(readFileSync(new URL("../src/lib/hyderabad-areas.json", import.meta.url), "utf8"));
  const src = readFileSync(new URL("../functions/src/places.ts", import.meta.url), "utf8");
  const b = json.bounds;
  assert.ok(src.includes(`minLat: ${b.minLat}, maxLat: ${b.maxLat}, minLng: ${b.minLng}, maxLng: ${b.maxLng}`));
});
