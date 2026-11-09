#!/usr/bin/env node
// A 3D flythrough of a trip, day by day: site/fly/<slug>.html, one self-contained page.
//
//   node tools/build.mjs && node tools/fly.mjs <slug>
//
// It reads the day lines and pins that tools/geojson.mjs already wrote to
// site/maps/, so it shows exactly what the other maps show: road lines from
// routes.yaml, verified pins only. Terrain comes from tools/lib/terrain.mjs.
// A toy for a computer, not a planning tool. Nothing here feeds the plan.
import fs from "node:fs";
import path from "node:path";
import { TERRAIN_SOURCE, boxOf, grid, haversineKm, pad } from "./lib/terrain.mjs";

const slug = process.argv[2];
if (!slug) { console.error("usage: node tools/fly.mjs <slug>   (after node tools/build.mjs)"); process.exit(1); }
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { console.error(`missing ${f}: run node tools/build.mjs first`); process.exit(1); } };
const lines = read(`site/maps/${slug}-trip.geojson`).features.filter((f) => f.geometry?.type === "LineString");
const points = read(`site/maps/${slug}.geojson`).features.filter((f) => f.geometry?.type === "Point" && f.properties.name);
if (!lines.length) { console.error(`${slug} has no day lines`); process.exit(1); }

const r5 = (v) => Math.round(v * 1e5) / 1e5;
const pack = (g) => {
  let min = Infinity, max = -Infinity;
  for (const v of g.data) { if (v < min) min = v; if (v > max) max = v; }
  const q = new Uint16Array(g.data.length), k = 65535 / Math.max(1, max - min);
  for (let i = 0; i < q.length; i++) q[i] = Math.round((g.data[i] - min) * k);
  return { w: g.w, s: g.s, e: g.e, n: g.n, nx: g.nx, ny: g.ny, min: Math.round(min), max: Math.round(max), b64: Buffer.from(q.buffer).toString("base64") };
};
const pinsFor = (pred) => {
  const seen = new Map();
  for (const f of points) if (pred(f.properties) && !seen.has(f.properties.name))
    seen.set(f.properties.name, { name: f.properties.name, lon: r5(f.geometry.coordinates[0]), lat: r5(f.geometry.coordinates[1]), camp: f.properties.role === "camp" });
  return [...seen.values()];
};

const days = lines.map((f) => {
  const p = f.properties, line = f.geometry.coordinates.map(([lon, lat]) => [r5(lon), r5(lat)]);
  const pins = pinsFor((q) => q.day === p.day);
  // A camp that is also a stop keeps its camp flag.
  for (const q of points) if (q.properties.day === p.day && q.properties.role === "camp") { const hit = pins.find((x) => x.name === q.properties.name); if (hit) hit.camp = true; }
  let km = 0;
  for (let i = 1; i < line.length; i++) km += haversineKm(line[i - 1], line[i]);
  const box = pad(boxOf([...line, ...pins.map((x) => [x.lon, x.lat])]), 0.35, 7);
  process.stdout.write(`  day ${p.day} · ${p.title} · ${Math.round(km * 0.621371)} mi\n`);
  return { day: p.day, date: p.date, title: p.title, shape: p.shape, km: Math.round(km * 10) / 10, line, pins, grid: pack(grid(box, 224)) };
});

const all = lines.flatMap((f) => f.geometry.coordinates);
const camps = pinsFor((q) => q.role === "camp");
const overview = { grid: pack(grid(pad(boxOf(all), 0.12, 40), 420, 9)), pins: camps };

const trip = fs.readFileSync(`trips/${slug}/trip.md`, "utf8");
const title = (trip.match(/^title:\s*(.+)$/m)?.[1] ?? slug).replace(/^["']|["']$/g, "");
const data = { slug, title, terrain: TERRAIN_SOURCE, roads: lines[0].properties.source ?? "", built: new Date().toISOString().slice(0, 10), overview, days };

const html = fs.readFileSync("site/src/fly.html", "utf8").replaceAll("__TITLE__", title).replace("__DATA__", () => JSON.stringify(data));
const out = `site/fly/${slug}.html`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${out} · ${days.length} days · ${(html.length / 1e6).toFixed(1)} MB`);
