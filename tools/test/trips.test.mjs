/* Every trip file is curated by hand now (and by Claude from a phone), so
   these run on the real files. A trip.md that doesn't survive parse → emit →
   parse would silently lose something the next time a tool rewrites it. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { emitTrip, parseTrip, parseSchedule, emitSchedule } from "../lib/format.mjs";

const TRIPS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "trips");
const slugs = readdirSync(TRIPS).filter((s) => existsSync(join(TRIPS, s, "trip.md")));
const plain = (v) => JSON.parse(JSON.stringify(v));

test("schedule lines survive text containing the separator", () => {
  const rows = [
    { kind: "drive", time: "7:30 → 1:05", est: "5h 35m", text: "A · B · C", maps: "Somewhere KY" },
    { kind: "stop", time: "OPTIONAL 6:00 → 7:30", est: "—", text: "No maps here", warn: true },
    { kind: "hike", time: "optional", text: "No estimate at all" },
  ];
  assert.deepEqual(parseSchedule(emitSchedule(rows)), rows);
});

for (const slug of slugs) {
  test(`${slug}: trip.md round-trips with nothing lost`, () => {
    const a = parseTrip(readFileSync(join(TRIPS, slug, "trip.md"), "utf8"));
    const b = parseTrip(emitTrip(a));
    assert.deepEqual(plain(b.registry), plain(a.registry), "frontmatter");
    assert.deepEqual(Object.keys(b.page).sort(), Object.keys(a.page).sort(), "no section invented or lost");
    for (const k of Object.keys(a.page)) assert.deepEqual(plain(b.page[k]), plain(a.page[k]), `section: ${k}`);
  });

  const placesFile = join(TRIPS, slug, "places.yaml");
  if (existsSync(placesFile)) {
    test(`${slug}: no coordinate without provenance`, () => {
      for (const p of YAML.parse(readFileSync(placesFile, "utf8")).groups.flatMap((g) => g.places)) {
        const hasCoord = p.lat != null || p.lng != null;
        if (!hasCoord) continue;
        assert.ok(p.lat != null && p.lng != null, `${p.name}: half a coordinate`);
        assert.ok(p.source, `${p.name}: a coordinate with no source (never invent one; set verified: false and null)`);
      }
    });
  }
}
