#!/usr/bin/env node
/* geojson.mjs — every trip as map data, for Kepler.gl, Felt or anything
   else that reads GeoJSON.

     node tools/geojson.mjs            # writes site/maps/*.geojson, prints what's unplaced
     node tools/geojson.mjs --todo     # just the unplaced list: the coordinate work queue

   Per trip, two files:
     <slug>.geojson       plain 2D: verified places as points, one line per day.
                          Felt, Kepler (static), geojson.io, uMap.
     <slug>-trip.geojson  the day lines only, each vertex [lng, lat, 0, unix-seconds],
                          which is what Kepler's Trip layer animates.
   Plus all.geojson and all-trip.geojson, every trip at once.

   A day's line runs through its verified stops in schedule order, camp to
   camp (the same order as the site's Google Maps links). Unverified stops
   are skipped, never guessed, and counted on the line as `skipped`. The
   line is straight between stops (`shape: "straight"`) unless the trip's
   routes.yaml lists a GPX for that day, which is then the line
   (`shape: "road"`) and carries that entry's source.

   The clock is fake. Stops are spread 08:00 → 18:00 on the day's date so
   playback shows the order and the day, not when anything happens.
   Nothing here invents a place; it only reshapes verified ones. */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { parseTrip } from "./lib/format.mjs";
import { dayStops, campStop } from "./lib/route.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const has = (rel) => existsSync(join(ROOT, rel));

// Twelve distinct day colors, cycled. Hex for simplestyle readers, RGB for Kepler.
const PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324", "#469990", "#800000", "#808000", "#000075"];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const DAY0 = 8 * 3600, SPAN = 10 * 3600;

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

/** The day's date: its own `date`, else start/target + (day − 1), else null. */
function dateOf(d, r) {
  if (d.date) return String(d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date);
  const base = r.start ?? r.target;
  return base ? addDays(String(base instanceof Date ? base.toISOString().slice(0, 10) : base), d.day - 1) : null;
}

/** GPX text → [[lng, lat], …] from its track points, else route points. */
export function gpxLine(text) {
  const pts = (tag) => [...text.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "g"))].map((m) => {
    const lat = /lat="([-\d.]+)"/.exec(m[0]), lon = /lon="([-\d.]+)"/.exec(m[0]);
    return lat && lon ? [Number(lon[1]), Number(lat[1])] : null;
  }).filter(Boolean);
  const trk = pts("trkpt");
  return trk.length ? trk : pts("rtept");
}

/** One trip → { flat, trip, todo }. `routes` maps day number → { line, source, file }. */
export function tripGeo(slug, md, groups = [], routes = new Map()) {
  const { registry: r, page } = parseTrip(md);
  const places = groups.flatMap((g) => g.places.map((p) => ({ ...p, group: g.group })));
  const byQuery = new Map(places.filter((p) => p.verified).flatMap((p) => [[`${p.lat},${p.lng}`, p]]));
  const camp = (o) => campStop(o?.name, places);
  const flat = [], trip = [], seen = new Set();
  const days = page.days ?? [];

  days.forEach((d, i) => {
    const color = PALETTE[(d.day - 1) % PALETTE.length];
    const date = dateOf(d, r);
    const t0 = date ? Date.parse(`${date}T00:00:00Z`) / 1000 : (d.day - 1) * 86400;
    const { start, stops } = dayStops(d.schedule ?? [], places, { start: i ? camp(days[i - 1].overnight) : null, end: camp(d.overnight) });
    const all = [start, ...stops].filter(Boolean);
    // Skipping an unplaced stop can leave one place twice in a row (camp → ? → camp).
    const pinned = all.filter((s) => s.pinned).map((s) => byQuery.get(s.q)).filter((p, k, a) => p && p !== a[k - 1]);
    const step = pinned.length > 1 ? SPAN / (pinned.length - 1) : 0;
    const base = { trip: slug, day: d.day, date, title: d.title, color, lineColor: rgb(color), fillColor: rgb(color) };

    pinned.forEach((p, k) => {
      const ts = t0 + DAY0 + Math.round(k * step);
      const isCamp = k === pinned.length - 1 && camp(d.overnight)?.label === p.name;
      flat.push(point(p, { ...base, seq: k + 1, role: isCamp ? "camp" : "stop", time: iso(ts), timestamp: ts }));
      seen.add(p.name);
    });

    const road = routes.get(d.day);
    const line = road ? road.line : pinned.map((p) => [p.lng, p.lat]);
    if (line.length < 2) return;
    const props = { ...base, kind: "leg", shape: road ? "road" : "straight", stops: pinned.length, skipped: all.length - pinned.length, stroke: color, "stroke-width": 3, ...(road ? { source: road.source } : {}) };
    flat.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: line } });
    const lstep = SPAN / (line.length - 1);
    trip.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: line.map(([x, y], k) => [x, y, 0, t0 + DAY0 + Math.round(k * lstep)]) } });
  });

  // Verified places no day's schedule reaches still belong on the map.
  for (const p of places) if (p.verified && !seen.has(p.name)) flat.push(point(p, { trip: slug, day: null, date: null, role: "place", color: "#666666", fillColor: [102, 102, 102] }));

  const todo = places.filter((p) => !p.verified).map((p) => ({ trip: slug, group: p.group, name: p.name, maps: p.maps ?? null, days: p.days ?? null }));
  return { flat, trip, todo, title: r.title };
}

const iso = (s) => new Date(s * 1000).toISOString().replace("T", " ").slice(0, 16);

function point(p, extra) {
  const props = { kind: "place", name: p.name, group: p.group, icon: p.icon ?? null, note: p.wpNote ?? p.note ?? null, source: p.source, days: p.days ?? null, ...extra };
  props["marker-color"] = props.color;
  return { type: "Feature", properties: props, geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
}

/** trips/<slug>/routes.yaml → Map(day → { line, source, file }). Every entry needs a source. */
export function loadRoutes(slug, readRel = read, exists = has) {
  const rel = `trips/${slug}/routes.yaml`;
  if (!exists(rel)) return new Map();
  const out = new Map();
  for (const e of YAML.parse(readRel(rel)) ?? []) {
    if (!e.source) throw new Error(`${rel}: day ${e.day} has no source (where the line came from)`);
    const files = [e.files ?? e.file].flat();
    const line = files.flatMap((f) => gpxLine(readRel(`trips/${slug}/${f}`)));
    if (line.length < 2) throw new Error(`${rel}: day ${e.day}'s GPX has no track or route points`);
    out.set(Number(e.day), { line, source: e.source, file: files.join(", ") });
  }
  return out;
}

const fc = (features) => JSON.stringify({ type: "FeatureCollection", features });

/** Every trip → site/maps/. Returns the summary lines. With todoOnly, writes nothing and prints the unplaced list. */
export function writeMaps({ todoOnly = false } = {}) {
  const slugs = readdirSync(join(ROOT, "trips")).filter((s) => has(`trips/${s}/trip.md`)).sort();
  const all = { flat: [], trip: [], todo: [] };
  const lines = [];
  for (const slug of slugs) {
    const groups = has(`trips/${slug}/places.yaml`) ? YAML.parse(read(`trips/${slug}/places.yaml`)).groups ?? [] : [];
    const g = tripGeo(slug, read(`trips/${slug}/trip.md`), groups, loadRoutes(slug));
    all.flat.push(...g.flat); all.trip.push(...g.trip); all.todo.push(...g.todo);
    if (!todoOnly) {
      mkdirSync(join(ROOT, "site/maps"), { recursive: true });
      writeFileSync(join(ROOT, `site/maps/${slug}.geojson`), fc(g.flat));
      writeFileSync(join(ROOT, `site/maps/${slug}-trip.geojson`), fc(g.trip));
    }
    const pts = g.flat.filter((f) => f.geometry.type === "Point").length;
    const legs = g.trip.length, road = g.trip.filter((f) => f.properties.shape === "road").length;
    lines.push(`  ${slug.padEnd(24)} ${String(pts).padStart(3)} pins · ${String(legs).padStart(2)} day lines (${road} road) · ${g.todo.length} unplaced`);
  }
  if (!todoOnly) {
    writeFileSync(join(ROOT, "site/maps/all.geojson"), fc(all.flat));
    writeFileSync(join(ROOT, "site/maps/all-trip.geojson"), fc(all.trip));
    console.log(`wrote site/maps/: ${slugs.length} trips × 2 files + all.geojson, all-trip.geojson`);
    console.log(lines.join("\n"));
  }
  if (todoOnly) {
    let last = null;
    for (const t of all.todo) {
      if (t.trip !== last) console.log(`\n${t.trip}`), (last = t.trip);
      console.log(`  - ${t.name}${t.days ? ` (day ${t.days})` : ""}${t.maps ? `  · search: ${t.maps}` : ""}`);
    }
  } else console.log(`${all.todo.length} places still unplaced — node tools/geojson.mjs --todo lists them`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeMaps({ todoOnly: process.argv.includes("--todo") });
