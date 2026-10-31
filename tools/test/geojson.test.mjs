import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tripGeo, gpxLine, gpxParts, loadRoutes } from "../geojson.mjs";

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
  assert.equal(c[0][3], Date.parse("2027-03-05T01:00:00Z") / 1000);
  assert.equal(c.at(-1)[3], Date.parse("2027-03-05T23:00:00Z") / 1000);
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

const flyMd = `---
slug: f
title: F
target: 2027-05-15
---

# F

## Days

### Day 1 — 2027-05-15 · Over

\`\`\`yaml
overnight:
  name: TBD, apartment
  mapStandIn: Flat
\`\`\`

**Schedule**
- 9:00 · travel · Coach. · 📍 DUB
- option · travel · Other coach. · 📍 Elsewhere
- 15:45 → 19:10 · fly · DUB → MRS. · 📍 MRS
- evening · travel · Shuttle. · 📍 Station
`;
const flyGroups = [{ group: "G", places: [
  { name: "DUB", maps: "DUB", verified: true, lat: 53.43, lng: -6.24, source: "test" },
  { name: "Elsewhere", maps: "Elsewhere", verified: true, lat: 52.0, lng: -9.0, source: "test" },
  { name: "MRS", maps: "MRS", verified: false, lat: null, lng: null },
  { name: "Station", maps: "Station", verified: true, lat: 43.30, lng: 5.38, source: "test" },
  { name: "Flat", maps: "Flat", verified: true, lat: 43.30, lng: 5.37, source: "test" },
] }];

test("flights: an option row isn't a stop, a flight to an unplaced airport still flies, a stand-in bed ends the day", () => {
  const leg = tripGeo("f", flyMd, flyGroups).flat.find((f) => f.properties.kind === "leg");
  const p = leg.properties, c = leg.geometry.coordinates;
  assert.deepEqual(p.flyHops, [2]); // seq of the stop the flight lands at: Station, carried past unplaced MRS
  assert.equal(p.bedStandIn, "Flat");
  assert.deepEqual(c[0], [-6.24, 53.43]);
  assert.ok(!c.some(([x, y]) => x === -9 && y === 52), "the option row's place is not on the line");
  const [[a, b]] = p.fly;
  assert.equal(a, 0); assert.ok(b > 10, "the flight is an arc, not one segment");
  assert.ok(p.flownMiles > 800 && p.flownMiles < 1000, `DUB–MRS is ~880 mi, got ${p.flownMiles}`);
  assert.ok(p.miles < 5, "only the shuttle and the walk to the flat count as ground");
});

test("gpxParts: a track typed fly is a flight; a plain GPX is one ground part", () => {
  const two = `<gpx><trk><trkseg><trkpt lat="1" lon="2"/><trkpt lat="1.5" lon="2.5"/></trkseg></trk><trk><type>fly</type><trkseg><trkpt lat="1.5" lon="2.5"/><trkpt lat="5" lon="6"/></trkseg></trk></gpx>`;
  assert.deepEqual(gpxParts(two).map((p) => p.fly), [false, true]);
  assert.deepEqual(gpxParts(`<gpx><rte><rtept lat="1" lon="2"/><rtept lat="3" lon="4"/></rte></gpx>`), [{ fly: false, line: [[2, 1], [4, 3]] }]);
});

test("a guessed start reaches back past days with nothing placed, names where it starts, and skips nothing", () => {
  const md3 = `---
slug: t
title: T
target: 2027-03-05
---

# T

## Days

### Day 1 — 2027-03-05 · One

\`\`\`yaml
overnight:
  name: TBD — motel
\`\`\`

**Schedule**
- 8:00 · drive · To A. · 📍 A town

### Day 2 — 2027-03-06 · Two

\`\`\`yaml
overnight:
  name: TBD — motel
\`\`\`

**Schedule**
- 8:00 · drive · Onward.

### Day 3 — 2027-03-07 · Three

\`\`\`yaml
overnight:
  name: Camp C — first-come
\`\`\`

**Schedule**
- 8:00 · drive · Camp. · 📍 Camp C WV
`;
  const g = tripGeo("t", md3, groups);
  assert.deepEqual(g.noLine, [1, 2]);
  const leg = g.trip.find((f) => f.properties.day === 3).properties;
  assert.equal(leg.startGuessed, true);
  assert.equal(leg.startFrom, "A town");
  assert.equal(leg.startFromDay, 1);
  assert.equal(leg.skipped, 0);
});
