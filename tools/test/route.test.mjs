import { test } from "node:test";
import assert from "node:assert/strict";
import { dayStops, routeLinks, campStop } from "../lib/route.mjs";

const places = [
  { name: "A town", maps: "A town", verified: true, lat: 38.1, lng: -81.2 },
  { name: "B trailhead", maps: "B trailhead", verified: false, lat: null, lng: null },
  { name: "Camp C", maps: "Camp C WV", verified: false, lat: null, lng: null },
];

test("camps: overnight name matches a place, suffix after the dash ignored", () => {
  assert.deepEqual(campStop("Camp C — first-come", places), { label: "Camp C", q: "Camp C WV", pinned: false });
  assert.equal(campStop("FS 210 roadside dispersed", places), null);
});

test("stops: schedule order, repeats dropped, verified pinned, camp to camp", () => {
  const start = campStop("Camp C", places);
  const r = dayStops([{ maps: "A town" }, { maps: "A town" }, {}, { maps: "B trailhead" }], places, { start, end: start });
  assert.equal(r.start.label, "Camp C");
  assert.deepEqual(r.stops.map((x) => x.q), ["38.1,-81.2", "B trailhead", "Camp C WV"]);
  const same = dayStops([{ maps: "Camp C WV" }], places, { end: campStop("Camp C", places) });
  assert.equal(same.stops.length, 1); // a schedule stop that is tonight's camp isn't repeated
  const home = dayStops([{ maps: "Avon, OH" }], [], { end: { label: "Home", q: "Avon, Ohio" } });
  assert.equal(home.stops.length, 1); // two spellings of one town
});

test("links: start is the origin, split at 3 waypoints, chained", () => {
  const stops = "abcdef".split("").map((c) => ({ label: c, q: c }));
  const l = routeLinks({ start: { label: "camp", q: "camp" }, stops });
  assert.equal(l.length, 2);
  assert.ok(l[0].url.includes("origin=camp") && l[0].url.includes("destination=d") && l[0].url.includes("waypoints=a%7Cb%7Cc"));
  assert.ok(l[1].url.includes("origin=d") && l[1].url.includes("destination=f"));
  assert.ok(!routeLinks({ start: null, stops })[0].url.includes("origin="));
});
