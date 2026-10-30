import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import YAML from "yaml";
import { gearQuestions, promises, logDrift, logEntries, pinMismatches, partition, fingerprint, stripWas } from "../lib/garden.mjs";

const pins = YAML.parse(readFileSync(new URL("../../garden/pins.yaml", import.meta.url), "utf8"));
const kentucky = { slug: "kentucky-2026", end: "2026-09-27" };
const apps = { slug: "appalachians-2026", end: "2026-10-25" };

test("an unanswered gear question is raised only once its trip is over", () => {
  const gear = "```yaml\n- name: Liner\n  state: own\n  question:\n    text: Warm enough?\n    answeredBy: appalachians-2026\n```\n";
  assert.equal(gearQuestions(gear, [apps], "2026-10-20").length, 0, "trip still running");
  const f = gearQuestions(gear, [apps], "2026-10-26");
  assert.equal(f.length, 1);
  assert.equal(f[0].line, 6);
  const answered = gear.replace("answeredBy: appalachians-2026", "answeredBy: appalachians-2026\n    answer: yes");
  assert.equal(gearQuestions(answered, [apps], "2026-10-26").length, 0);
});

test("a promise is pinned to the trip named next to it, not anywhere on the line", () => {
  const line = 'answer: "Unanswerable from Kentucky (lows ~50°F). Buying anyway as cheap insurance. Re-ask after the Appalachians trip."';
  assert.equal(promises("me/gear.md", line, [kentucky]).length, 0, "Kentucky is mentioned, but the promise is about Appalachians");
  const f = promises("me/gear.md", line, [kentucky, apps]);
  assert.equal(f.length, 1);
  assert.equal(f[0].subject, "appalachians-2026");
});

test("a question deferred to a finished retro is a promise (missed by hand, first trial run 2026-10-12)", () => {
  const line = "Whether these held up in the field is a retro question for Kentucky. See the retro prompts in [`trips/kentucky-2026/log.md`]";
  assert.equal(promises("me/hiking.md", line, [kentucky]).length, 1);
});

test("history inside a (was: …) note never counts as a claim", () => {
  assert.equal(stripWas("Spice 2–3 of 5 (was: 1–2 of 5, stated 2026-09-28)").includes("1–2"), false);
  assert.equal(promises("me/food.md", "Fine now (was: the Kentucky retro will answer this)", [kentucky]).length, 0);
});

test("a decision logged after trip.md last changed is drift; same day is assumed applied", () => {
  const log = "# log\n\n## 2026-10-12 · Decided: Table Rock Gap\n\nx\n\n## 2026-10-13 · Research sweep\n\n## 2026-10-14 · Picked Stone Cliff over Army Camp\n";
  const e = logEntries(log);
  assert.deepEqual(e.map((x) => x.line), [3, 7, 9]);
  const f = logDrift("appalachians-2026", e, "2026-10-12");
  assert.deepEqual(f.map((x) => x.subject), ["2026-10-14 · Picked Stone Cliff over Army Camp"]);
  assert.equal(logDrift("x", e, null).length, 0, "no git history means no claim");
});

test("the pins hold on today's wording, and catch a stale copy when the fact changes (eval edit 4)", () => {
  const files = {
    "me/food.md": "Spice **1–2 of 5**: background heat. Target **~3,300 kcal/day** on a hiking trip.",
    "CLAUDE.md": "Spice ceiling 1–2 of 5. No coffee, no beer.",
    "kitchen/staples.md": "OAS respected, spice ≤ 2/5 (mild taco seasoning only)",
    "me/profile.md": "Hyundai, ~5.9 in ground clearance, low front air dam",
    "trips/x/trip.md": "the road wants more clearance for 5.9 in",
  };
  assert.deepEqual(pinMismatches(pins, files), []);

  // Colin says "call it 2–3": the home file and the pin change, the copies don't.
  const raised = structuredClone(pins);
  raised[0].says = "2–3 of 5"; raised[0].patterns[0].expect = "2–3"; raised[0].patterns[1].expect = "3";
  const changed = { ...files, "me/food.md": files["me/food.md"].replace("1–2", "2–3 (was: 1–2 of 5)") };
  const stale = pinMismatches(raised, changed).map((f) => f.file).sort();
  assert.deepEqual(stale, ["CLAUDE.md", "kitchen/staples.md"]);
});

test("a dismissed finding stays hidden across line moves, and returns if its text changes", () => {
  const f = { check: "promise-past-trip", file: "me/gear.md", line: 41, subject: "appalachians-2026", says: "Re-ask after the Appalachians trip." };
  const dismissed = [{ fingerprint: fingerprint(f), date: "2026-10-30", reason: "still open on purpose" }];
  assert.equal(partition([{ ...f, line: 55 }], dismissed).shown.length, 0);
  assert.equal(partition([{ ...f, says: "Re-ask after the Appalachians and Sky Islands trips." }], dismissed).shown.length, 1);
});
