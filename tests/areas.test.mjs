import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The security rules can't import the area list, so they carry a copy. This keeps the two identical.
const json = JSON.parse(readFileSync(new URL("../src/lib/hyderabad-areas.json", import.meta.url), "utf8"));
const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

test("firestore.rules lists exactly the Hyderabad areas in hyderabad-areas.json", () => {
  const block = rules.split("// BEGIN hyderabad-areas")[1].split("// END hyderabad-areas")[0];
  const inRules = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(inRules, json.areas.map((a) => a.name));
});

test("every area sits inside the service bounds and names are unique", () => {
  const { minLat, maxLat, minLng, maxLng } = json.bounds;
  for (const a of json.areas) {
    assert.ok(a.lat >= minLat && a.lat <= maxLat && a.lng >= minLng && a.lng <= maxLng, `${a.name} is outside the bounds`);
  }
  assert.equal(new Set(json.areas.map((a) => a.name)).size, json.areas.length);
  assert.ok(rules.includes(`lat >= ${minLat} && lat <= ${maxLat} && lng >= ${minLng} && lng <= ${maxLng}`), "rules bounds differ from the JSON");
});
