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

test("pack GPX: a flight in a road line is left out of the track", () => {
  const routes = new Map([[7, { source: "src", parts: [
    { fly: false, line: [[-6.2, 53.4], [-6.3, 53.5]] }, { fly: true, line: [[-6.3, 53.5], [0, 49], [5.2, 43.4]] }, { fly: false, line: [[5.2, 43.4], [5.4, 43.3]] }] }]]);
  const segs = [...toGpx("T", groups, routes).matchAll(/<trkseg>([\s\S]*?)<\/trkseg>/g)].map((m) => gpxLine(m[1]));
  assert.deepEqual(segs, [[[-6.2, 53.4], [-6.3, 53.5]], [[5.2, 43.4], [5.4, 43.3]]]);
});
