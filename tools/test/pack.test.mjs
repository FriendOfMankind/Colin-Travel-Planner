import { test } from "node:test";
import assert from "node:assert/strict";
import { toGpx, dayTitles } from "../pack.mjs";
import { gpxLine } from "../geojson.mjs";

const groups = [{ group: "Camps", places: [
  { name: "A & B", verified: true, lat: 32.1, lng: -110.9, days: 1 },
  { name: "Unplaced", verified: false, lat: null, lng: null },
] }];

test("pack GPX: verified pins only, plus one track per sourced road line", () => {
  const routes = new Map([[2, { line: [[-110.9, 32.1], [-110.8, 32.2]], source: "src" }], [1, { line: [[-111, 32], [-110.9, 32.1]], source: "src" }]]);
  const gpx = toGpx("T", groups, routes, new Map([[1, "Land"]]));
  assert.equal((gpx.match(/<wpt /g) ?? []).length, 1);
  assert.match(gpx, /A &amp; B/);
  assert.deepEqual([...gpx.matchAll(/<trk><name>([^<]+)/g)].map((m) => m[1]), ["Day 1 · Land", "Day 2"]);
  assert.deepEqual(gpxLine(gpx), [[-111, 32], [-110.9, 32.1], [-110.9, 32.1], [-110.8, 32.2]]);
});

test("pack GPX: no routes means no tracks", () => {
  assert.doesNotMatch(toGpx("T", groups), /<trk>/);
});

test("dayTitles reads the day headings", () => {
  const t = dayTitles("### Day 1 — 2027-03-05 · Land in the Saguaros\n\ntext\n### Day 11 — 2027-03-15 · Out\n");
  assert.deepEqual([...t], [[1, "Land in the Saguaros"], [11, "Out"]]);
});
