/* A trip's slideshow takes its words from trip.md, so the only thing that can
   rot is the shot list: a shot pointing at a day or a stop the plan no longer
   has, or a Commons picture with no credit. These run on every real
   trips/<slug>/slides.yaml, plus the text cleaning the slides rely on. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTrip } from "../lib/format.mjs";
import { checkSlides, deck, lede, parseSlides, plain } from "../lib/slides.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const slugs = readdirSync(join(ROOT, "trips")).filter((s) => existsSync(join(ROOT, "trips", s, "slides.yaml")));

for (const slug of slugs) test(`${slug}: every shot points at a day and a stop the plan still has`, () => {
  const days = parseTrip(readFileSync(join(ROOT, "trips", slug, "trip.md"), "utf8")).page.days;
  const spec = parseSlides(readFileSync(join(ROOT, "trips", slug, "slides.yaml"), "utf8"));
  assert.ok(spec.shots.length > 0, "has shots");
  assert.deepEqual(checkSlides(spec, days), []);
});

test("plan text loses its provenance notes and Markdown on a slide", () => {
  assert.equal(plain("**Skellig** landing, ~600 steps *(recalled)*. €170 *(skelligmichael.ie (2027), snippet)*."), "Skellig landing, ~600 steps. €170.");
});

test("a slide's text stops at a sentence, and a web address isn't one", () => {
  const t = "Quoted on skelligmichael.ie for 2027. Capped at 180 people a day. " + "More detail than fits. ".repeat(20);
  assert.equal(lede(t, 70), "Quoted on skelligmichael.ie for 2027. Capped at 180 people a day.");
});

test("the first picture of a stop carries the plan's words; a second carries its own brief", () => {
  const days = [{ day: 7, date: "2027-05-15", title: "Skellig", schedule: [{ time: "morning", kind: "ferry", text: "**Skellig Michael landing**: a monastery on a sea rock *(recalled)*." }], warnings: "**Steep**: no handrails." }];
  const d = deck({ shots: [{ id: "d07-a", day: 7, stop: "Skellig Michael landing", shot: "The steps" }, { id: "d07-b", day: 7, stop: "Skellig Michael landing", shot: "The huts", title: "The beehive huts" }] }, days)[0];
  assert.equal(d.slides[0].title, "Skellig Michael landing");
  assert.equal(d.slides[0].text, "A monastery on a sea rock.");
  assert.equal(d.slides[1].title, "The beehive huts");
  assert.equal(d.slides[1].text, "The huts");
  assert.deepEqual(d.warnings, [{ lead: "Steep", text: "No handrails." }]);
  assert.deepEqual(checkSlides({ shots: [{ id: "d07-a", day: 7, stop: "Gone", shot: "x" }] }, days), ['d07-a: no row on day 7 mentions "Gone" any more']);
});

test("a leg of travel with no picture gets its own slide, in the order of the day; options don't", () => {
  const days = [{ day: 1, date: "2027-05-09", title: "Out", schedule: [
    { time: "20:40", kind: "fly", text: "**EI 86 CLE → DUB**, nonstop *(screenshot, 2026-11-04)*." },
    { time: "option", kind: "travel", text: "**A slower coach**." },
    { time: "evening", kind: "stop", text: "**Dingle**. Family." }] }];
  const d = deck({ shots: [{ id: "d01-dingle", day: 1, stop: "Dingle", shot: "The harbour" }] }, days)[0];
  assert.deepEqual(d.slides.map((s) => [s.kind, s.title]), [["leg", "EI 86 CLE → DUB"], ["photo", "Dingle"]]);
  assert.equal(d.plan.length, 3);
  assert.equal(d.plan[1].soft, true);
});
