/* The timeline's gap maths, on the real calendar (me/calendar.md) with fixed
   trips, so a plan change can't break it but a calendar or logic change will. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { buildTimeline, calendarFrom, fitFor } from "../lib/timeline.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cal = calendarFrom(readFileSync(join(ROOT, "me/calendar.md"), "utf8"), YAML);
const trips = [
  { slug: "sky", start: "2027-03-06", end: "2027-03-14" },
  { slug: "eur", start: "2027-05-10", end: "2027-05-24" },
  { slug: "nfl", start: "2027-05-26", end: "2027-06-24" },
  { slug: "gla", start: "2027-07-12", end: "2027-08-14" },
];
const ideas = [
  { slug: "adk", months: [1], days: 8, start: "2027-01-07", end: "2027-01-14" },
  { slug: "frisco", months: [12], days: 6, start: "2026-12-25", end: "2026-12-30" },
  { slug: "summer", months: [7], days: 10 },
  { slug: "toolong", months: [7], days: 30 },
];
const T = buildTimeline({ today: "2026-11-01", cal, trips, ideas });
const gaps = T.items.filter((x) => x.type === "gap").map((g) => `${g.start}..${g.end}`);

test("the calendar has a horizon and terms", () => {
  assert.ok(cal.horizon?.date && cal.terms?.length);
});
test("gaps: runs of 5+ free days, between classes, finals, family and trips", () => {
  assert.deepEqual(gaps, [
    "2026-11-10..2026-11-15", "2026-11-24..2026-11-29", "2026-12-19..2026-12-24",
    "2026-12-31..2027-01-18", "2027-06-25..2027-07-11", "2027-08-15..2027-08-30",
  ]);
});
test("a pencilled idea sits in its gap; one on blocked days stands alone and hides the block", () => {
  const winter = T.items.find((x) => x.type === "gap" && x.start === "2026-12-31");
  assert.deepEqual(winter.pencilled, ["adk"]);
  assert.ok(T.items.some((x) => x.type === "idea" && x.slug === "frisco"));
  assert.ok(!T.items.some((x) => x.type === "mark" && /Frisco/.test(x.title)));
});
test("ideas fit a gap by month and length; pencilled ones aren't offered again", () => {
  const july = T.items.find((x) => x.type === "gap" && x.start === "2027-06-25");
  assert.deepEqual(july.ideas, ["summer"]);
  assert.equal(july.fit.mode, "fly");
});
test("labels come from noClass names; the horizon closes the list", () => {
  assert.equal(T.items.find((x) => x.start === "2026-11-24").label, "Thanksgiving Break");
  assert.ok(T.items.at(-1).horizon);
});
test("fitFor picks the longest mode that fits", () => {
  assert.equal(fitFor(6, cal.modeFit).mode, "drive");
  assert.equal(fitFor(3, cal.modeFit).mode, "weekend");
  assert.equal(fitFor(2, cal.modeFit), null);
});
