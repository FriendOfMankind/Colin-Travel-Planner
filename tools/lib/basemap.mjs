/* basemap.mjs — just enough coastline for a trip map to read as a place.

   Natural Earth 1:10m land and country borders (the world-atlas package),
   clipped to a trip's box and simplified to its scale, so the site can draw
   a map with no tile server: it works offline and inside the claude.ai page.
   1:10m is about a kilometre of detail, so it shows where the coast is, not
   which side of a cove a campground sits on. Pins and road lines carry that. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature, mesh } from "topojson-client";

const require = createRequire(import.meta.url);
let cache = null;
function atlas() {
  if (!cache) {
    const land = JSON.parse(readFileSync(require.resolve("world-atlas/land-10m.json"), "utf8"));
    const countries = JSON.parse(readFileSync(require.resolve("world-atlas/countries-10m.json"), "utf8"));
    cache = {
      land: feature(land, land.objects.land).features.flatMap((f) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)),
      borders: mesh(countries, countries.objects.countries, (a, b) => a !== b).coordinates,
    };
  }
  return cache;
}

/** Douglas–Peucker on [lng, lat] pairs. */
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  // A closed ring starts and ends on one point, so every point sits on that zero-length
  // "line" and the ring would vanish. Split it at its farthest point and do each half.
  const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
  if (fx === lx && fy === ly && pts.length > 3) {
    let far = 1, best = -1;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.hypot(pts[i][0] - fx, pts[i][1] - fy); if (d > best) { best = d; far = i; } }
    return [...simplify(pts.slice(0, far + 1), tol), ...simplify(pts.slice(far), tol).slice(1)];
  }
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    let far = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > far) { far = d; idx = i; }
    }
    if (far > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const r4 = ([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4];

// Sutherland–Hodgman against one edge of the box at a time.
function clipRing(ring, [x0, y0, x1, y1]) {
  const edges = [[(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]]];
  let out = ring;
  for (const [inside, cut] of edges) {
    const src = out; out = [];
    for (let i = 0; i < src.length; i++) {
      const cur = src[i], prev = src[(i + src.length - 1) % src.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

const touches = (pts, [x0, y0, x1, y1]) => pts.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)
  || (Math.min(...pts.map((p) => p[0])) < x0 && Math.max(...pts.map((p) => p[0])) > x1);

/** Land rings and border lines inside box [x0, y0, x1, y1], simplified to its size. */
export function basemap(box) {
  const tol = Math.max(box[2] - box[0], box[3] - box[1]) / 3000;
  const { land, borders } = atlas();
  const rings = [];
  for (const poly of land) for (const ring of poly) {
    if (!touches(ring, box) && !(ring.some(([x]) => x < box[0]) && ring.some(([x]) => x > box[2]) && ring.some(([, y]) => y < box[1]) && ring.some(([, y]) => y > box[3]))) continue;
    const c = clipRing(ring, box);
    if (c.length < 3) continue;
    const s = simplify(c, tol).map(r4);
    if (s.length >= 3) rings.push(s);
  }
  const lines = [];
  for (const line of borders) {
    let run = [];
    for (const p of line) {
      const inside = p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];
      if (inside) run.push(p); else { if (run.length > 1) lines.push(run); run = []; }
    }
    if (run.length > 1) lines.push(run);
  }
  return { land: rings, borders: lines.map((l) => simplify(l, tol).map(r4)) };
}
