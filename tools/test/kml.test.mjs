import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { tripGeo, loadRoutes } from "../geojson.mjs";
import { tripKml, groundParts, kmlColor, LIMITS } from "../kml.mjs";

test("KML colors are aabbggrr", () => {
  assert.equal(kmlColor("#e6194b"), "ff4b19e6");
});

test("a flight is cut out of the day line, leaving the ground on either side", () => {
  const line = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
  assert.deepEqual(groundParts(line, [[1, 3]]), [[[0, 0], [1, 0]], [[3, 0], [4, 0]]]);
  assert.deepEqual(groundParts(line), [line]);
});

// My Maps drops folders and MultiGeometries and refuses big files (support.google.com/mymaps/answer/3024836).
const TRIPS = join(dirname(fileURLToPath(import.meta.url)), "../../trips");
for (const slug of readdirSync(TRIPS)) {
  if (!existsSync(join(TRIPS, slug, "trip.md"))) continue;
  const places = join(TRIPS, slug, "places.yaml");
  const g = tripGeo(slug, readFileSync(join(TRIPS, slug, "trip.md"), "utf8"), existsSync(places) ? YAML.parse(readFileSync(places, "utf8")).groups : [], loadRoutes(slug));
  if (!g.flat.length) continue;
  test(`${slug}: KML fits My Maps, lines and pins apart, one pin per place, every feature has a kind`, () => {
    const files = tripKml(slug, g);
    for (const text of Object.values(files)) {
      assert.doesNotMatch(text, /<Folder|<MultiGeometry/);
      assert.ok(Buffer.byteLength(text) <= LIMITS.bytes);
    }
    const all = files[`${slug}-lines.kml`] + files[`${slug}-pins.kml`];
    const names = [...all.matchAll(/<Placemark><name>([^<]*)<\/name>[\s\S]*?<Point>/g)].map((m) => m[1]);
    assert.equal(names.length, new Set(names).size, "a place appears once");
    assert.deepEqual(Object.keys(files), [`${slug}-lines.kml`, `${slug}-pins.kml`]);
    assert.doesNotMatch(files[`${slug}-pins.kml`], /<LineString>/, "lines stay out of the pins layer");
    // Every feature carries a kind, the column My Maps groups the pins by.
    assert.equal((all.match(/<Placemark>/g) ?? []).length, (all.match(/<Data name="kind">/g) ?? []).length);
    for (const m of all.matchAll(/<styleUrl>#([^<]+)<\/styleUrl>/g)) assert.match(all, new RegExp(`<Style id="${m[1]}">`));
  });
}
