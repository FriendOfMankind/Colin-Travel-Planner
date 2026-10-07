import { test } from "node:test";
import assert from "node:assert/strict";
import { dayStops, routeLinks } from "../lib/route.mjs";

const places = [{ maps: "A town", verified: true, lat: 38.1, lng: -81.2 }, { maps: "B trailhead", verified: false, lat: null, lng: null }];

test("stops: schedule order, repeats dropped, verified places pinned", () => {
  const s = dayStops([{ maps: "A town" }, { maps: "A town" }, {}, { maps: "B trailhead" }, { maps: "A town" }], places);
  assert.deepEqual(s.map((x) => x.q), ["38.1,-81.2", "B trailhead", "38.1,-81.2"]);
  assert.deepEqual(s.map((x) => x.pinned), [true, false, true]);
});

test("links: no origin on the first, split at 3 waypoints, chained", () => {
  const stops = "abcdef".split("").map((c) => ({ label: c, q: c }));
  const l = routeLinks(stops);
  assert.equal(l.length, 2);
  assert.ok(!l[0].url.includes("origin="));
  assert.ok(l[0].url.includes("destination=d") && l[0].url.includes("waypoints=a%7Cb%7Cc"));
  assert.ok(l[1].url.includes("origin=d") && l[1].url.includes("destination=f") && l[1].url.includes("waypoints=e"));
  assert.equal(l[1].from, "d");
});
