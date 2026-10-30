import { test } from "node:test";
import assert from "node:assert/strict";
import { simplify, basemap } from "../lib/basemap.mjs";

test("a closed ring survives simplification", () => {
  // Start = end once made every point look like it sat on the line, and islands vanished.
  assert.ok(simplify([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], 0.01).length >= 4);
});

test("the Newfoundland box draws the island, not just the mainland", () => {
  const { land } = basemap([-60, 46, -52, 52]);
  const grosMorne = [-57.8, 49.55];
  // Some ring must surround Gros Morne (ray-casting point-in-polygon).
  const inside = (ring, [x, y]) => ring.reduce((c, [xi, yi], i) => { const [xj, yj] = ring[(i + ring.length - 1) % ring.length]; return ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi ? !c : c; }, false);
  assert.ok(land.some((r) => inside(r, grosMorne)), "Gros Morne should be on land");
});

// coast.json (tools/coast.py): detailed coast along a trip's route. Like every coordinate, it carries a source.
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const TRIPS = join(dirname(fileURLToPath(import.meta.url)), "../../trips");
for (const slug of readdirSync(TRIPS)) {
  const f = join(TRIPS, slug, "coast.json");
  if (!existsSync(f)) continue;
  test(`${slug}: coast.json has a source, corridor areas and closed land rings`, () => {
    const c = JSON.parse(readFileSync(f, "utf8"));
    assert.match(c.source ?? "", /\S/);
    assert.ok(c.areas.length > 0 && c.land.length > 0);
    for (const r of c.land) assert.deepEqual(r[0], r[r.length - 1]);
  });
}
