import { test } from "node:test";
import assert from "node:assert/strict";
import { sections, slice, find } from "../lib/sections.mjs";

const doc = [
  "---", "title: x", "---", "", "# Trip", "", "## Days", "",
  "### Day 1 — 2027-07-12 · Go", "drive", "",
  "### Day 10 — 2027-07-21 · Lamar", "wolves", "```", "## not a heading", "```", "",
  "## Hikes", "- one", "",
].join("\n");

test("sections: frontmatter, nesting and ranges", () => {
  const s = sections(doc);
  assert.deepEqual(s.map((x) => [x.level, x.title, x.start, x.end]), [
    [0, "frontmatter", 1, 3],
    [1, "Trip", 5, 19],
    [2, "Days", 7, 16],
    [3, "Day 1 — 2027-07-12 · Go", 9, 10],
    [3, "Day 10 — 2027-07-21 · Lamar", 12, 16],
    [2, "Hikes", 18, 19],
  ]);
});

test("find: day N never matches day 1N, dates and text work", () => {
  const s = sections(doc);
  assert.deepEqual(find(s, "day 1").map((x) => x.title), ["Day 1 — 2027-07-12 · Go"]);
  assert.deepEqual(find(s, "2027-07-21").map((x) => x.start), [12]);
  assert.deepEqual(find(s, "HIKES").map((x) => x.title), ["Hikes"]);
  assert.equal(find(s, "front")[0].level, 0);
  assert.equal(slice(doc, find(s, "day 10")[0]).includes("## not a heading"), true);
});
