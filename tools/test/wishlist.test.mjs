/* The wishlist is only useful for "what fits May?" if every idea says when
   and how. These run on the real files, so a /daydream that adds an idea
   without months or mode fails here instead of silently never matching. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { emitIdea, parseIdea, summarize } from "../lib/wishlist.mjs";
import { HORIZONS } from "../lib/bucket.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "wishlist");
const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));

test("the wishlist is not empty", () => assert.ok(files.length > 0));

for (const f of files) {
  test(`wishlist/${f}: required fields, and it round-trips`, () => {
    const text = readFileSync(join(DIR, f), "utf8");
    const idea = parseIdea(text);
    const { fm } = idea;
    assert.equal(fm.slug, f.replace(/\.md$/, ""), "slug must match the file name");
    assert.equal(fm.status, "wishlist");
    assert.ok(fm.title, "title");
    assert.ok(Array.isArray(fm.months) && fm.months.length && fm.months.every((m) => m >= 1 && m <= 12), "months: a list of 1–12");
    assert.ok(["drive", "fly", "weekend"].includes(fm.mode), "mode: drive | fly | weekend");
    assert.ok(fm.updated, "updated");
    assert.ok(fm.source, "source");
    if (fm.horizon != null) assert.ok(HORIZONS.includes(fm.horizon), `horizon: ${HORIZONS.join(" | ")}`);
    // Semantic round trip: hand edits may format YAML differently, but
    // nothing may be lost. The dated research notes are what this guards.
    const again = parseIdea(emitIdea(idea));
    assert.deepEqual(again.fm, fm, "frontmatter survives");
    for (const k of ["why", "next", "notes"]) assert.equal(again[k], idea[k], `${k} survives`);
    assert.equal(again.entries.length, (text.match(/^### \d{4}-\d{2}-\d{2}/gm) ?? []).length, "every dated note is parsed");
  });
}

test("summarize cuts at a word and never leaves bold open", () => {
  assert.equal(summarize("short"), "short");
  assert.equal(summarize("first para\n\nsecond"), "first para");
  const s = summarize("**" + "word ".repeat(80) + "**", 50);
  assert.ok(s.endsWith("…") && !s.includes("**"));
});
