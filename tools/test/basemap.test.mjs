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
