/* The wishlist is only useful for "what fits May?" if every idea says when
   and how. These run on the real files, so a /daydream that adds an idea
   without months or mode fails here instead of silently never matching. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { emitIdea, parseIdea, summarize } from "../lib/wishlist.mjs";

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
    assert.equal(emitIdea(idea), text, "emit(parse(file)) must reproduce the file exactly");
  });
}

test("summarize cuts at a word and never leaves bold open", () => {
  assert.equal(summarize("short"), "short");
  assert.equal(summarize("first para\n\nsecond"), "first para");
  const s = summarize("**" + "word ".repeat(80) + "**", 50);
  assert.ok(s.endsWith("…") && !s.includes("**"));
});
