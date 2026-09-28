/* The format is only trustworthy if it is lossless. These tests take a real
   Trees trip, convert it, write it as trip.md, parse that back, and demand
   the same data — field for field, day for day, schedule line for schedule
   line. A converter that drops a warning is worse than no converter.

   Skipped (not failed) when no Trees checkout is present, because after
   cutover there won't be one. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { emitTrip, parseTrip, parseSchedule, emitSchedule } from "../lib/format.mjs";
import { htmlToMd, htmlToMdInline } from "../lib/md.mjs";

const { TREES } = await import("../lib/trees.mjs").catch(() => ({ TREES: null }));
const haveTrees = TREES && existsSync(join(TREES, "data/trips.js"));
const SLUGS = ["kentucky-2026", "appalachians-2026"];
const plain = (v) => JSON.parse(JSON.stringify(v));

test("html → markdown covers the tags Trees used", () => {
  assert.equal(htmlToMd("a <b>b</b> <i>c</i> <em>d</em> <code>e</code>"), "a **b** *c* *d* `e`");
  assert.equal(htmlToMd("one<br><br>two<br>three"), "one\n\ntwo\nthree");
  assert.equal(htmlToMdInline("one<br>two"), "one<br>two");
  assert.equal(htmlToMd('<a href="../x">y</a>'), "[y](../x)");
});

test("schedule lines survive text containing the separator", () => {
  const rows = [
    { kind: "drive", time: "7:30 → 1:05", est: "5h 35m", text: "A · B · C", maps: "Somewhere KY" },
    { kind: "stop", time: "OPTIONAL 6:00 → 7:30", est: "—", text: "No maps here", warn: true },
    { kind: "hike", time: "optional", text: "No estimate at all" },
  ];
  assert.deepEqual(parseSchedule(emitSchedule(rows)), rows);
});

for (const slug of SLUGS) {
  test(`${slug}: trip.md round-trips losslessly`, { skip: !haveTrees && "no Trees checkout" }, async () => {
    const { convertTrip } = await import("../lib/trees.mjs");
    const t = convertTrip(slug);
    const back = parseTrip(emitTrip({ registry: t.registry, page: t.page }));

    assert.deepEqual(plain(back.registry), plain(t.registry), "registry / frontmatter");
    for (const key of Object.keys(t.page)) {
      assert.deepEqual(plain(back.page[key]), plain(t.page[key]), `section: ${key}`);
    }
    assert.deepEqual(Object.keys(back.page).sort(), Object.keys(t.page).sort(), "no section invented or lost");
  });

  test(`${slug}: every Trees waypoint lands in places.yaml exactly once`, { skip: !haveTrees && "no Trees checkout" }, async () => {
    const { convertTrip, tripData } = await import("../lib/trees.mjs");
    const t = convertTrip(slug);
    const placed = t.places.flatMap((g) => g.places).filter((p) => p.lat != null);
    for (const w of tripData(slug).waypoints ?? []) {
      const hits = placed.filter((p) => p.lat === w.lat && p.lng === w.lng);
      assert.equal(hits.length, 1, `${w.name} appears ${hits.length} times`);
      assert.equal(hits[0].verified, !!w.verified, `${w.name}: verified flag changed`);
    }
    // And nothing gains a coordinate it didn't have.
    for (const p of t.places.flatMap((g) => g.places)) {
      if (p.lat != null) assert.ok(p.verified || p.source, `${p.name} has a coordinate with no provenance`);
    }
  });
}
