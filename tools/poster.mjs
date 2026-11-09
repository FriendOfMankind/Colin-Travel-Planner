#!/usr/bin/env node
// A print poster of a trip: shaded relief and contours, the route, where he sleeps, and the
// elevation along the line. Writes site/posters/<slug>.pdf (24 x 18 in), a .jpg preview and a
// self-contained .html page.
//
//   node tools/build.mjs && node tools/poster.mjs <slug> [--dpi 200]
//
// Same inputs as tools/fly.mjs: the day lines and verified pins in site/maps/, terrain from
// tools/lib/terrain.mjs. Every number on the sheet is computed here from those (miles from the
// line, elevations from the terrain model, marked ≈). Nothing is typed in.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { TERRAIN_SOURCE, boxOf, elevation, grid, haversineKm, pad } from "./lib/terrain.mjs";

const slug = process.argv[2], dpiArg = process.argv.indexOf("--dpi"), DPI = dpiArg > 0 ? +process.argv[dpiArg + 1] : 200;
if (!slug) { console.error("usage: node tools/poster.mjs <slug> [--dpi 200]   (after node tools/build.mjs)"); process.exit(1); }
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { console.error(`missing ${f}: run node tools/build.mjs first`); process.exit(1); } };
const lines = read(`site/maps/${slug}-trip.geojson`).features.filter((f) => f.geometry?.type === "LineString").sort((a, b) => a.properties.day - b.properties.day);
const points = read(`site/maps/${slug}.geojson`).features.filter((f) => f.geometry?.type === "Point" && f.properties.name);
if (!lines.length) { console.error(`${slug} has no day lines`); process.exit(1); }
const front = fs.readFileSync(`trips/${slug}/trip.md`, "utf8").split(/^---$/m)[1] ?? "";
const fm = (k) => (front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1] ?? "").replace(/^["']|["']$/g, "");
const title = fm("title") || slug, subtitle = fm("subtitle");

const MI = 0.621371, FT = 3.28084, KM_LAT = 110.574;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const f1 = (v) => (Math.round(v * 10) / 10).toString();
const INK = "#1b2220", PAPER = "#f1f3ee", FOREST = "#2e6a4f", BLAZE = "#e4b02e", WATER = "#2c5e8c";

// ---- the sheet, in points (72 per inch) -------------------------------------
const all = lines.flatMap((f) => f.geometry.coordinates);
let box = pad(boxOf(all), 0.07, 60);
const lat0 = (box.s + box.n) / 2, kmLon = 111.32 * Math.cos((lat0 * Math.PI) / 180);
const landscape = (box.e - box.w) * kmLon >= (box.n - box.s) * KM_LAT;
const PW = landscape ? 1728 : 1296, PH = landscape ? 1296 : 1728, M = 50, STRIP = 150, GAP = 44, FOOT = 26;
const F = { x: M, y: M, w: PW - 2 * M, h: PH - 2 * M - STRIP - GAP - FOOT };
{ // grow the box to the frame's shape
  const wKm = (box.e - box.w) * kmLon, hKm = (box.n - box.s) * KM_LAT, want = F.w / F.h;
  if (wKm / hKm < want) { const d = (hKm * want - wKm) / kmLon / 2; box = { ...box, w: box.w - d, e: box.e + d }; }
  else { const d = (wKm / want - hKm) / KM_LAT / 2; box = { ...box, s: box.s - d, n: box.n + d }; }
}
const X = (lon) => F.x + ((lon - box.w) / (box.e - box.w)) * F.w, Y = (lat) => F.y + ((box.n - lat) / (box.n - box.s)) * F.h;
const ptPerKm = F.w / ((box.e - box.w) * kmLon);

// ---- the relief plate (raster) ----------------------------------------------
process.stdout.write("terrain… ");
const g = grid(box, Math.round((Math.max(F.w, F.h) / 72) * DPI), 9), { nx, ny, data: H } = g;
const cellM = (g.wKm * 1000) / (nx - 1), rgb = Buffer.alloc(nx * ny * 3);
const mix = (c, t, a) => { c[0] += (t[0] - c[0]) * a; c[1] += (t[1] - c[1]) * a; c[2] += (t[2] - c[2]) * a; };
const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const iso = (h, grad, step, half) => { const d = Math.abs(h - Math.round(h / step) * step) / Math.max(grad, 1e-6); return Math.max(0, Math.min(1, half + 0.5 - d)); };
const L = (() => { const az = (315 * Math.PI) / 180, alt = (42 * Math.PI) / 180; return [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)]; })();
const ZF = 2.6, STEP = 200, k = DPI / 200;
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
  const a = j * nx + i, h = H[a];
  const dx = (H[j * nx + Math.min(nx - 1, i + 1)] - H[j * nx + Math.max(0, i - 1)]) / 2, dy = (H[Math.min(ny - 1, j + 1) * nx + i] - H[Math.max(0, j - 1) * nx + i]) / 2;
  const grad = Math.hypot(dx, dy), c = [229, 234, 226];
  if (h <= 0) {
    c[0] = 205; c[1] = 220; c[2] = 229;
    mix(c, [44, 94, 140], 0.22 * iso(h, grad, 500, 0.4 * k));
  } else {
    mix(c, [208, 223, 208], 0.6 * sstep(900, 150, h));
    mix(c, [250, 250, 247], 0.55 * sstep(2300, 3300, h));
    const nxv = (-dx * ZF) / cellM, nyv = (dy * ZF) / cellM, len = Math.hypot(nxv, nyv, 1), s = (nxv * L[0] + nyv * L[1] + L[2]) / len - L[2];
    if (s < 0) mix(c, [27, 34, 32], Math.min(0.5, -s * 1.15)); else mix(c, [255, 255, 255], Math.min(0.7, s * 2.2));
    const fade = sstep(1.6, 3.6, STEP / Math.max(grad, 1e-6));
    mix(c, [46, 106, 79], Math.max(0.34 * fade * iso(h, grad, STEP, 0.3 * k), 0.62 * iso(h, grad, STEP * 5, 0.55 * k)));
    mix(c, [44, 94, 140], 0.7 * iso(h, grad, 1e9, 0.45 * k)); // the coast
  }
  rgb[a * 3] = c[0]; rgb[a * 3 + 1] = c[1]; rgb[a * 3 + 2] = c[2];
}
function png(w, h, data) {
  const crc = (() => { const t = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; }); return (b) => { let c = -1; for (const v of b) c = t[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
  const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); const td = Buffer.concat([Buffer.from(type), body]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) data.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 6 })), chunk("IEND", Buffer.alloc(0))]);
}
const outDir = "site/posters";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(`${outDir}/${slug}-plate.png`, png(nx, ny, rgb));
console.log(`${nx}×${ny} px plate`);

// ---- the route, the nights, the profile -------------------------------------
const days = lines.map((f) => {
  const c = f.geometry.coordinates;
  let km = 0; const cum = [0];
  for (let i = 1; i < c.length; i++) cum.push((km += haversineKm(c[i - 1], c[i])));
  return { day: f.properties.day, date: f.properties.date, title: f.properties.title, road: f.properties.shape === "road", c, km, cum };
});
const roadDays = days.filter((d) => d.road), totalKm = roadDays.reduce((s, d) => s + d.km, 0), straight = days.filter((d) => !d.road && d.km > 4);
const nights = new Map();
for (const f of points) if (f.properties.role === "camp") { const n = nights.get(f.properties.name) ?? { name: f.properties.name, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], days: [] }; if (!n.days.includes(f.properties.day)) n.days.push(f.properties.day); nights.set(n.name, n); }
const runs = (ds) => { const s = [...ds].sort((a, b) => a - b), out = []; for (let i = 0; i < s.length; i++) { let j = i; while (s[j + 1] === s[j] + 1) j++; out.push(j > i ? `${s[i]}–${s[j]}` : `${s[i]}`); i = j; } return out.join(", "); };

const prof = []; let hi = { m: -Infinity };
{ let off = 0;
  for (const d of roadDays) {
    d.x0 = off;
    if (d.km > 4) for (let s = 0, i = 0, n = Math.max(2, Math.round(d.km / 1.2)); s <= n; s++) {
      const at = (d.km * s) / n; while (i < d.c.length - 2 && d.cum[i + 1] < at) i++;
      const t = d.cum[i + 1] > d.cum[i] ? (at - d.cum[i]) / (d.cum[i + 1] - d.cum[i]) : 0, lon = d.c[i][0] + (d.c[i + 1][0] - d.c[i][0]) * t, lat = d.c[i][1] + (d.c[i + 1][1] - d.c[i][1]) * t;
      const m = Math.max(0, elevation(lon, lat, 10)); prof.push([off + at, m]); if (m > hi.m) hi = { m, km: off + at, day: d.day, lon, lat };
    }
    off += d.km; d.x1 = off;
  } }

// ---- drawing ----------------------------------------------------------------
const S = [];
const text = (x, y, s, o = {}) => S.push(`<text x="${f1(x)}" y="${f1(y)}" class="${o.cls ?? "d"}" font-size="${o.size ?? 10}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.fill ? ` fill="${o.fill}"` : ""}${o.halo ? ` stroke="${PAPER}" stroke-width="${o.halo}" paint-order="stroke" stroke-linejoin="round"` : ""}${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.weight ? ` font-weight="${o.weight}"` : ""}>${esc(s)}</text>`);
const wOf = (s, size, mono) => s.length * size * (mono ? 0.6 : 0.47);

// neatline and graticule ticks
S.push(`<rect x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" fill="none" stroke="${INK}" stroke-width="1.4"/>`);
const gstep = box.e - box.w > 12 ? 2 : box.e - box.w > 5 ? 1 : 0.5;
for (let lon = Math.ceil(box.w / gstep) * gstep; lon < box.e; lon += gstep) { const x = X(lon); if (x < F.x + 20 || x > F.x + F.w - 20) continue; S.push(`<path d="M${f1(x)} ${F.y}v-6M${f1(x)} ${F.y + F.h}v6" stroke="${INK}" stroke-width=".8"/>`); text(x, F.y - 10, `${Math.abs(lon)}°${lon < 0 ? "W" : "E"}`, { cls: "m", size: 7.5, anchor: "middle" }); }
for (let lat = Math.ceil(box.s / gstep) * gstep; lat < box.n; lat += gstep) { const y = Y(lat); if (y < F.y + 20 || y > F.y + F.h - 20) continue; S.push(`<path d="M${F.x} ${f1(y)}h-6M${F.x + F.w} ${f1(y)}h6" stroke="${INK}" stroke-width=".8"/>`); S.push(`<text class="m" font-size="7.5" text-anchor="middle" transform="translate(${F.x - 10} ${f1(y)}) rotate(-90)">${Math.abs(lat)}°${lat < 0 ? "S" : "N"}</text>`); }

// the line: every day, cased
const routePts = [], paths = { road: "", straight: "" };
for (const d of days) {
  let last = null, p = "";
  for (const [lon, lat] of d.c) { const x = X(lon), y = Y(lat); if (last && Math.hypot(x - last[0], y - last[1]) < 0.35) continue; p += `${last ? "L" : "M"}${f1(x)} ${f1(y)}`; last = [x, y]; routePts.push(last); }
  if (!d.road && d.km > 4) for (let i = 1; i < d.c.length; i++) for (let s = 1; s < 12; s++) routePts.push([X(d.c[i - 1][0] + ((d.c[i][0] - d.c[i - 1][0]) * s) / 12), Y(d.c[i - 1][1] + ((d.c[i][1] - d.c[i - 1][1]) * s) / 12)]);
  paths[d.road ? "road" : "straight"] += p;
}
S.push(`<g fill="none" stroke-linejoin="round" stroke-linecap="round"><path d="${paths.road}" stroke="${INK}" stroke-width="5"/><path d="${paths.road}" stroke="${BLAZE}" stroke-width="2.8"/><path d="${paths.straight}" stroke="${INK}" stroke-width="2.2" stroke-dasharray="1 5"/></g>`);

// where he sleeps: a dot and a two-line label, placed where it collides least
const taken = [], hits = (r) => taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1]);
const crowd = (r) => routePts.reduce((n, p) => n + (p[0] > r[0] && p[0] < r[2] && p[1] > r[1] && p[1] < r[3] ? 1 : 0), 0);
const sleeps = [...nights.values()].sort((a, b) => Math.min(...a.days) - Math.min(...b.days));
for (const n of sleeps) taken.push([X(n.lon) - 6, Y(n.lat) - 6, X(n.lon) + 6, Y(n.lat) + 6]);
for (const n of sleeps) {
  const x = X(n.lon), y = Y(n.lat), name = n.name.toUpperCase(), sub = `NIGHT${n.days.length > 1 ? "S" : ""} ${runs(n.days)}`, w = Math.max(wOf(name, 11.5) + 4, wOf(sub, 7, true)), h = 24;
  const spots = [[9, -h / 2, "start"], [-9 - w, -h / 2, "end"], [9, -h - 3, "start"], [9, 5, "start"], [-9 - w, -h - 3, "end"], [-9 - w, 5, "end"], [-w / 2, -h - 9, "middle"], [-w / 2, 9, "middle"]];
  let best = null;
  for (const [dx, dy, anchor] of spots) { const r = [x + dx, y + dy, x + dx + w, y + dy + h]; if (r[0] < F.x + 4 || r[2] > F.x + F.w - 4 || r[1] < F.y + 4 || r[3] > F.y + F.h - 4) continue; const score = (hits(r) ? 1000 : 0) + crowd(r); if (!best || score < best.score) best = { r, anchor, score }; }
  if (!best) continue;
  taken.push(best.r);
  const tx = best.anchor === "start" ? best.r[0] : best.anchor === "end" ? best.r[2] : (best.r[0] + best.r[2]) / 2;
  S.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="4.6" fill="${INK}" stroke="${BLAZE}" stroke-width="1.8"/>`);
  text(tx, best.r[1] + 11, name, { size: 11.5, anchor: best.anchor, halo: 3.2, weight: 700, ls: ".03em" });
  text(tx, best.r[1] + 21, sub, { cls: "m", size: 7, anchor: best.anchor, halo: 2.6 });
}

// find the emptiest spot for a block of a given size
const obstacles = () => [...routePts, ...taken.flatMap((t) => [[t[0], t[1]], [t[2], t[1]], [t[0], t[3]], [t[2], t[3]], [(t[0] + t[2]) / 2, (t[1] + t[3]) / 2]])];
function emptiest(w, h) {
  const obs = obstacles(); let best = null;
  for (let y = F.y + 18; y + h <= F.y + F.h - 18; y += 14) for (let x = F.x + 18; x + w <= F.x + F.w - 18; x += 14) {
    let d = Infinity;
    for (const [px, py] of obs) { const ddx = Math.max(x - px, 0, px - (x + w)), ddy = Math.max(y - py, 0, py - (y + h)), v = Math.hypot(ddx, ddy); if (v < d) { d = v; if (best && d <= best.d) break; } }
    if (!best || d > best.d) best = { x, y, d };
  }
  taken.push([best.x - 10, best.y - 10, best.x + w + 10, best.y + h + 10]);
  return best;
}
const panel = (x, y, w, h) => S.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${PAPER}" fill-opacity=".9" stroke="${INK}" stroke-width=".8"/>`);

// title block
{
  const T = title.toUpperCase(), bw = Math.min(F.w * 0.56, 900), ts = Math.min(104, (bw - 44) / (T.length * 0.468));
  const first = new Date(days[0].date + "T12:00:00"), lastD = new Date(days[days.length - 1].date + "T12:00:00"), mo = (d) => d.toLocaleDateString("en-US", { month: "long" });
  const when = `${mo(first)}${mo(first) === mo(lastD) ? "" : "–" + mo(lastD)} ${lastD.getFullYear()}`.toUpperCase();
  const words = subtitle.split(/\s+/).filter(Boolean), sub = [""]; for (const wd of words) { if (wOf(sub[sub.length - 1] + " " + wd, 15) > bw - 48) sub.push(wd); else sub[sub.length - 1] += (sub[sub.length - 1] ? " " : "") + wd; }
  const bh = 34 + ts * 0.86 + (subtitle ? sub.length * 19 + 8 : 0) + 58, b = emptiest(bw, bh);
  panel(b.x, b.y, bw, bh);
  let y = b.y + 26;
  text(b.x + 22, y, `${when} · ${days.length} DAYS DRAWN`, { cls: "m", size: 9.5, ls: ".12em" });
  y += ts * 0.84; text(b.x + 20, y, T, { size: ts, weight: 700, ls: ".005em" });
  if (subtitle) { y += 10; for (const l of sub) { y += 19; text(b.x + 22, y, l, { size: 15, weight: 500 }); } }
  y += 26;
  const stats = [`${Math.round(totalKm * MI).toLocaleString("en-US")} MI OF ROAD LINE`, `${sleeps.length} PLACES TO SLEEP`, `HIGH POINT ≈ ${(Math.round((hi.m * FT) / 50) * 50).toLocaleString("en-US")} FT`];
  text(b.x + 22, y, stats.join("   ·   "), { cls: "m", size: 9, ls: ".06em" });
  // scale bar
  const miles = [200, 100, 50, 25, 10].find((m) => (m / MI) * ptPerKm < bw * 0.3) ?? 5, len = (miles / MI) * ptPerKm, sx = b.x + bw - 22 - len, sy = y - 3;
  S.push(`<path d="M${f1(sx)} ${f1(sy - 4)}v4h${f1(len)}v-4M${f1(sx + len / 2)} ${f1(sy - 3)}v3" fill="none" stroke="${INK}" stroke-width="1"/>`);
  text(sx + len, sy - 8, `${miles} MI`, { cls: "m", size: 7.5, anchor: "end" }); text(sx, sy - 8, "0", { cls: "m", size: 7.5 });
  y += 16; if (straight.length) text(b.x + 22, y, `Dotted: day${straight.length > 1 ? "s" : ""} ${runs(straight.map((d) => d.day))}, straight between stops until the road line is drawn. Not in the miles or the profile.`, { cls: "m", size: 7, fill: "#3c4642" });
}

// the days, as a legend
{
  const cols = days.length > 16 ? 2 : 1, rows = Math.ceil(days.length / cols), cw = 256, rh = 12.6, bw = cols * cw + 26, bh = rows * rh + 46, b = emptiest(bw, bh);
  panel(b.x, b.y, bw, bh);
  text(b.x + 16, b.y + 24, "DAY BY DAY", { size: 13, weight: 700, ls: ".1em" });
  days.forEach((d, i) => {
    const x = b.x + 16 + Math.floor(i / rows) * cw, y = b.y + 44 + (i % rows) * rh;
    text(x, y, String(d.day).padStart(2, "0"), { cls: "m", size: 7.5, fill: FOREST, weight: 500 });
    text(x + 18, y, d.title.length > 42 ? d.title.slice(0, 41) + "…" : d.title, { size: 10.5, weight: 500 });
    text(x + cw - 14, y, d.km > 4 ? `${Math.round(d.km * MI)} mi` : "camp", { cls: "m", size: 7, anchor: "end", fill: "#5f6a65" });
  });
}

// north arrow, top left of the map unless something is there
{ const b = emptiest(26, 44), cx = b.x + 13; S.push(`<path d="M${f1(cx)} ${f1(b.y + 2)}l7 22h-14z" fill="${INK}"/><path d="M${f1(cx)} ${f1(b.y + 24)}v16" stroke="${INK}" stroke-width="1.2"/>`); text(cx, b.y + 52, "N", { size: 11, weight: 700, anchor: "middle", halo: 2.5 }); }

// elevation along the line
{
  const x0 = F.x, y1 = PH - M - FOOT, y0 = y1 - STRIP + 26, w = F.w, top = Math.max(1500, Math.ceil((hi.m * FT) / 2500) * 2500 / FT), px = (km) => x0 + (km / totalKm) * w, py = (m) => y1 - (m / top) * (y1 - y0);
  text(x0, y0 - 14, "ELEVATION ALONG THE LINE", { size: 13, weight: 700, ls: ".1em" });
  text(x0 + w, y0 - 14, "feet, from the terrain model · one tick per day with a road line", { cls: "m", size: 7.5, anchor: "end", fill: "#5f6a65" });
  for (let ft = 0; ft <= top * FT + 1; ft += top * FT > 6000 ? 5000 : 1000) { const y = py(ft / FT); S.push(`<path d="M${x0} ${f1(y)}h${w}" stroke="${INK}" stroke-width="${ft ? 0.35 : 1}" ${ft ? 'stroke-dasharray="1 4"' : ""}/>`); if (ft) text(x0 + 3, y - 3, ft.toLocaleString("en-US"), { cls: "m", size: 7 }); }
  let area = ""; let prev = -1e9;
  const segs = []; for (const p of prof) { if (p[0] - prev > 3) segs.push([]); segs[segs.length - 1].push(p); prev = p[0]; }
  let top2 = "";
  for (const s of segs) { const l = s.map(([km, m], i) => `${i ? "L" : "M"}${f1(px(km))} ${f1(py(m))}`).join(""); top2 += l; area += `M${f1(px(s[0][0]))} ${f1(y1)}L` + l.slice(1) + `L${f1(px(s[s.length - 1][0]))} ${f1(y1)}Z`; }
  S.push(`<path d="${area}" fill="${FOREST}" fill-opacity=".26"/><path d="${top2}" fill="none" stroke="${FOREST}" stroke-width="1.1" stroke-linejoin="round"/>`);
  let lastLabel = -1e9;
  for (const d of roadDays) { const xa = px(d.x0), xm = (px(d.x0) + px(d.x1)) / 2; S.push(`<path d="M${f1(xa)} ${f1(y1)}v5" stroke="${INK}" stroke-width=".8"/>`); if (px(d.x1) - xa > 11 && xm - lastLabel > 11) { text(xm, y1 + 13, String(d.day), { cls: "m", size: 7, anchor: "middle" }); lastLabel = xm; } }
  if (isFinite(hi.m)) { const x = px(hi.km), y = py(hi.m); S.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${BLAZE}" stroke="${INK}" stroke-width="1"/>`); text(x + (x > x0 + w - 160 ? -7 : 7), y - 5, `≈ ${(Math.round((hi.m * FT) / 50) * 50).toLocaleString("en-US")} ft · day ${hi.day}`, { cls: "m", size: 8, anchor: x > x0 + w - 160 ? "end" : "start", halo: 2.5 }); S.push(`<circle cx="${f1(X(hi.lon))}" cy="${f1(Y(hi.lat))}" r="3" fill="${BLAZE}" stroke="${INK}" stroke-width="1"/>`); }
}
text(F.x, PH - M + 6, `Plan as of ${new Date().toISOString().slice(0, 10)}. Roads: ${lines[0].properties.source ?? "routes.yaml"}. Terrain: ${TERRAIN_SOURCE}. Contours every ${STEP} m, heavy every ${STEP * 5} m. A poster, not a map to drive by.`, { cls: "m", size: 6.6, fill: "#5f6a65" });

// ---- write: html (self-contained), pdf, jpg ---------------------------------
const require = createRequire(import.meta.url);
const font = (pkg, file) => fs.readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`)).toString("base64");
const faces = [["Barlow Condensed", 500, font("barlow-condensed", "barlow-condensed-latin-500-normal.woff2")], ["Barlow Condensed", 700, font("barlow-condensed", "barlow-condensed-latin-700-normal.woff2")], ["IBM Plex Mono", 400, font("ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff2")], ["IBM Plex Mono", 500, font("ibm-plex-mono", "ibm-plex-mono-latin-500-normal.woff2")]]
  .map(([fam, wt, b]) => `@font-face{font-family:"${fam}";font-weight:${wt};src:url(data:font/woff2;base64,${b}) format("woff2")}`).join("");
const svg = (href) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${esc(title)}: route poster"><style>${faces}.d{font-family:"Barlow Condensed","Arial Narrow",sans-serif;fill:${INK}}.m{font-family:"IBM Plex Mono",ui-monospace,monospace;fill:${INK}}</style><rect width="${PW}" height="${PH}" fill="${PAPER}"/><image href="${href}" x="${F.x}" y="${F.y}" width="${F.w}" height="${F.h}" preserveAspectRatio="none"/>${S.join("")}</svg>`;

const { chromium } = require("playwright");
const browser = await chromium.launch();
const abs = path.resolve(outDir);
const printHtml = `<!doctype html><meta charset="utf-8"><style>@page{size:${PW / 72}in ${PH / 72}in;margin:0}html,body{margin:0}svg{display:block;width:${PW / 72}in;height:${PH / 72}in}</style>${svg(`${slug}-plate.png`)}`;
fs.writeFileSync(`${outDir}/.${slug}-print.html`, printHtml);
const page = await browser.newPage({ viewport: { width: Math.round((PW / 72) * 96), height: Math.round((PH / 72) * 96) } });
await page.goto(`file://${abs}/.${slug}-print.html`); await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: `${outDir}/${slug}.pdf`, width: `${PW / 72}in`, height: `${PH / 72}in`, printBackground: true, pageRanges: "1" });
await page.screenshot({ path: `${outDir}/${slug}.jpg`, type: "jpeg", quality: 88 });
// a lighter plate for the page that gets shared
const pw = Math.min(nx, 2600), ph = Math.round((ny * pw) / nx);
await page.setViewportSize({ width: pw, height: ph });
await page.setContent(`<!doctype html><style>html,body{margin:0}img{display:block;width:${pw}px;height:${ph}px}</style><img id="p">`);
const jpg = await (async () => { const b64 = fs.readFileSync(`${outDir}/${slug}-plate.png`).toString("base64"); await page.evaluate((u) => new Promise((ok, no) => { const i = document.getElementById("p"); i.onload = ok; i.onerror = no; i.src = u; }), `data:image/png;base64,${b64}`); return page.screenshot({ type: "jpeg", quality: 86 }); })();
await browser.close();
fs.unlinkSync(`${outDir}/.${slug}-print.html`);

const shell = fs.readFileSync("site/src/poster.html", "utf8").replaceAll("__TITLE__", esc(title)).replaceAll("__SIZE__", `${PW / 72} × ${PH / 72} in`).replace("__DPI__", String(DPI)).replace("__POSTER__", () => svg(`data:image/jpeg;base64,${jpg.toString("base64")}`));
fs.writeFileSync(`${outDir}/${slug}.html`, shell);
const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1);
console.log(`wrote ${outDir}/${slug}.pdf (${mb(`${outDir}/${slug}.pdf`)} MB, ${PW / 72}×${PH / 72} in at ${DPI} dpi) · .jpg · .html (${mb(`${outDir}/${slug}.html`)} MB)`);
console.log(`high point on the line ≈ ${Math.round(hi.m * FT)} ft (day ${hi.day}, ${hi.lat.toFixed(4)}, ${hi.lon.toFixed(4)}; terrain model)`);
