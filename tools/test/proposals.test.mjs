/* share/proposals.yaml: every invite page is tracked, and every tracked page
   points at something real. A page saved into share/proposals/ without a row
   fails here, and so does a row naming a trip or idea that doesn't exist. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseProposals, behind, STATUSES, FORMATS } from "../lib/proposals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const has = (rel) => existsSync(join(ROOT, rel));
const read = (rel) => (has(rel) ? readFileSync(join(ROOT, rel), "utf8") : null);
const rows = parseProposals(read("share/proposals.yaml"));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

test("proposals.yaml is a list with unique ids", () => {
  assert.ok(Array.isArray(rows) && rows.length);
  const ids = rows.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate id");
});

for (const p of rows) {
  test(`proposal ${p.id}: shape and links`, () => {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.ok(p.title, "title");
    assert.match(p.url, /^https:\/\/claude\.ai\/(code\/)?artifact\/[A-Za-z0-9-]+$/, "url: a claude.ai artifact link");
    assert.ok(FORMATS.includes(p.format), `format: ${FORMATS.join(" | ")}`);
    assert.ok(STATUSES.includes(p.status), `status: ${STATUSES.join(" | ")}`);
    assert.ok(p.for, "for: who it's pitched to");
    assert.match(String(p.asOf), ISO, "asOf: YYYY-MM-DD");
    if (p.checked != null) assert.match(String(p.checked), ISO, "checked: YYYY-MM-DD");
    assert.ok(p.trip || p.wishlist, "trip or wishlist: the plan it's built from");
    if (p.trip) assert.ok(has(`trips/${p.trip}/trip.md`), `no trips/${p.trip}/trip.md`);
    if (p.wishlist) assert.ok(has(`wishlist/${p.wishlist}.md`), `no wishlist/${p.wishlist}.md`);
    if (p.format === "page") {
      assert.equal(p.source, `share/proposals/${p.id}.html`, "a page's source is share/proposals/<id>.html");
      const html = read(p.source);
      assert.ok(html, `missing ${p.source}`);
      // The publish step adds the document skeleton; a saved copy that still has it would get two.
      assert.ok(!/^<!doctype/i.test(html.trimStart()), `${p.source} starts with <!doctype>: strip the publish wrapper`);
      assert.ok(html.includes(`<title>${p.title.replace(/&/g, "&amp;")}</title>`) || html.includes(`<title>${p.title}</title>`), "the source's <title> matches title");
    } else assert.equal(p.source, undefined, "a doc has no source file: its words live in Claude Docs");
    if (p.status === "superseded") assert.ok(rows.some((q) => q.id === p.by), "superseded needs by: <id of the replacement>");
  });
}

test("every saved page in share/proposals/ has a row", () => {
  const files = has("share/proposals") ? readdirSync(join(ROOT, "share/proposals")).filter((f) => f.endsWith(".html")) : [];
  for (const f of files) assert.ok(rows.some((p) => p.source === `share/proposals/${f}`), `share/proposals/${f} has no row in proposals.yaml`);
});

test("behind(): live rows only, against the newest plan change", () => {
  const files = { "trips/x/log.md": "## 2026-10-01 · a\n\n## 2026-10-20 · b\n", "wishlist/y.md": "---\nupdated: 2026-10-25\n---\n" };
  const r = (rel) => files[rel] ?? null;
  assert.equal(behind({ status: "sent", trip: "x", asOf: "2026-10-20" }, r), null);
  assert.equal(behind({ status: "sent", trip: "x", asOf: "2026-10-10" }, r).changed.date, "2026-10-20");
  assert.equal(behind({ status: "sent", trip: "x", wishlist: "y", asOf: "2026-10-21" }, r).changed.where, "wishlist/y.md");
  assert.equal(behind({ status: "sent", trip: "x", asOf: "2026-10-10", checked: "2026-10-22" }, r), null);
  assert.equal(behind({ status: "parked", trip: "x", asOf: "2026-01-01" }, r), null);
  assert.ok(behind({ status: "draft", trip: "x", asOf: "2026-10-30", stale: "Day 3 is wrong" }, r).stale);
});
