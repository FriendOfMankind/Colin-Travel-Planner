import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tripGeo, gpxLine, loadRoutes } from "../geojson.mjs";

const md = `---
slug: t
title: T
target: 2027-03-05
---

# T

## Days

### Day 1 — 2027-03-05 · One

\`\`\`yaml
overnight:
  name: Camp C — first-come
\`\`\`

**Schedule**
- 8:00 · drive · To A. · 📍 A town
- 9:00 · hike · B. · 📍 B trailhead
- 10:00 · drive · Camp. · 📍 Camp C WV

### Day 2 — 2027-03-06 · Two

**Schedule**
- 8:00 · drive · Unknown. · 📍 Nowhere
`;
const groups = [{ group: "G", places: [
  { name: "A town", maps: "A town", verified: true, lat: 38.1, lng: -81.2, source: "test" },
  { name: "B trailhead", maps: "B trailhead", verified: false, lat: null, lng: null },
  { name: "Camp C", maps: "Camp C WV", verified: true, lat: 38.2, lng: -81.3, source: "test" },
  { name: "Off-plan", maps: "Off-plan", verified: true, lat: 38.3, lng: -81.4, source: "test" },
] }];

test("only verified places become points; unplaced ones are skipped and counted", () => {
  const g = tripGeo("t", md, groups);
  const pts = g.flat.filter((f) => f.geometry.type === "Point");
  assert.deepEqual(pts.map((f) => f.properties.name), ["A town", "Camp C", "Camp C", "Off-plan"]);
  assert.equal(pts[1].properties.role, "camp");
  assert.equal(pts.at(-1).properties.role, "place"); // verified but on no day
  const leg = g.flat.find((f) => f.properties.kind === "leg");
  assert.deepEqual(leg.geometry.coordinates, [[-81.2, 38.1], [-81.3, 38.2]]);
  assert.equal(leg.properties.skipped, 1);
  assert.equal(leg.properties.shape, "straight");
  assert.deepEqual(g.todo.map((t) => t.name), ["B trailhead"]);
});

test("trip file: 4D vertices on the day's date, a single-place day draws no line", () => {
  const g = tripGeo("t", md, groups);
  assert.equal(g.trip.length, 1);
  const c = g.trip[0].geometry.coordinates;
  assert.equal(c[0].length, 4);
  assert.equal(c[0][3], Date.parse("2027-03-05T08:00:00Z") / 1000);
  assert.equal(c.at(-1)[3], Date.parse("2027-03-05T18:00:00Z") / 1000);
});

test("a road GPX replaces the straight line and carries its source", () => {
  const line = gpxLine(`<gpx><trk><trkseg><trkpt lat="38.1" lon="-81.2"/><trkpt lat="38.15" lon="-81.25"></trkpt><trkpt lat="38.2" lon="-81.3"/></trkseg></trk></gpx>`);
  assert.deepEqual(line, [[-81.2, 38.1], [-81.25, 38.15], [-81.3, 38.2]]);
  const g = tripGeo("t", md, groups, new Map([[1, { line, source: "Google Maps → GPX" }]]));
  const leg = g.flat.find((f) => f.properties.kind === "leg");
  assert.equal(leg.properties.shape, "road");
  assert.equal(leg.properties.source, "Google Maps → GPX");
  assert.equal(leg.geometry.coordinates.length, 3);
});

test("a route with no source is refused", () => {
  const files = { "trips/t/routes.yaml": "- day: 1\n  file: routes/day-1.gpx\n", "trips/t/routes/day-1.gpx": "" };
  assert.throws(() => loadRoutes("t", (p) => files[p], (p) => p in files), /no source/);
});

const TRIPS = join(dirname(fileURLToPath(import.meta.url)), "../../trips");
for (const slug of readdirSync(TRIPS)) {
  if (!existsSync(join(TRIPS, slug, "routes.yaml"))) continue;
  test(`${slug}: every road line in routes.yaml has a source and a readable GPX`, () => {
    assert.ok(loadRoutes(slug).size > 0);
  });
}
