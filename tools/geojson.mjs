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

   A hop reached by a `fly` row is a great-circle arc, never a road. The
   arc stays inside the day's line (so the animation flies) and the leg
   lists it in `fly` as [first, last] vertex ranges, so the KML and the pack
   can leave it out and roads.py won't drive it. `miles` counts the ground, `flownMiles`
   the air. A GPX marks its flight tracks with <type>fly</type>.

   A day with a `ferry` row in its plan says `planFerry`: only then does
   roads.py hold a hop to a sailing. A bed with `mapStandIn:` (no fixed place yet) ends the day at that stand-in
   and the leg says `bedStandIn`.

   The clock is fake. Each day plays 01:00 → 23:00 on its date at constant
   speed along the line, so playback shows order and distance, not time of day.
   Nothing here invents a place; it only reshapes verified ones. */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { parseTrip } from "./lib/format.mjs";
import { dayStops, bedStop } from "./lib/route.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const has = (rel) => existsSync(join(ROOT, rel));

// Twelve distinct day colors, cycled. Hex for simplestyle readers, RGB for Kepler.
const PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324", "#469990", "#800000", "#808000", "#000075"];
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Each day plays 01:00 → 23:00 so the animation runs on with no overnight freeze.
const DAY0 = 1 * 3600, SPAN = 22 * 3600;

const km = ([x0, y0], [x1, y1]) => {
  const r = Math.PI / 180, h = Math.sin((y1 - y0) * r / 2) ** 2 + Math.cos(y0 * r) * Math.cos(y1 * r) * Math.sin((x1 - x0) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

/** The day's date: its own `date`, else start/target + (day − 1), else null. */
function dateOf(d, r) {
  if (d.date) return String(d.date instanceof Date ? d.date.toISOString().slice(0, 10) : d.date);
  const base = r.start ?? r.target;
  return base ? addDays(String(base instanceof Date ? base.toISOString().slice(0, 10) : base), d.day - 1) : null;
}

/** Great-circle arc a → b as [lng, lat] points, both ends included. */
export function arc(a, b, n = 48) {
  const r = Math.PI / 180, v = ([x, y]) => [Math.cos(y * r) * Math.cos(x * r), Math.cos(y * r) * Math.sin(x * r), Math.sin(y * r)];
  const p = v(a), q = v(b), w = Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  if (w < 1e-9) return [a, b];
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, s0 = Math.sin((1 - t) * w) / Math.sin(w), s1 = Math.sin(t * w) / Math.sin(w);
    const [x, y, z] = [0, 1, 2].map((k) => s0 * p[k] + s1 * q[k]);
    return [Math.atan2(y, x) / r, Math.atan2(z, Math.hypot(x, y)) / r];
  });
}

/** Parts → one line plus the [first, last] vertex ranges that are flown. */
function joinParts(parts) {
  const line = [], fly = [];
  for (const { line: l, fly: f } of parts) {
    const from = line.length ? line.length - 1 : 0;
    line.push(...(line.length ? l.slice(1) : l));
    if (f) fly.push([from, line.length - 1]);
  }
  return { line, fly };
}

/** GPX text → [{ fly, line }], one per track; a track typed "fly" is a flight. */
export function gpxParts(text) {
  const trks = [...text.matchAll(/<trk\b[\s\S]*?<\/trk>/g)].map((m) => m[0]);
  return (trks.length ? trks : [text]).map((t) => ({ fly: /<type>\s*fly\s*<\/type>/.test(t), line: gpxLine(t) })).filter((p) => p.line.length);
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
  const camp = (o) => bedStop(o, places);
  const flat = [], trip = [], seen = new Set();
  const days = page.days ?? [];
  let lastPin = null, lastPinDay = null; // the last placed stop so far, and its day
  // Home (a place marked `home: true`, once placed) opens day 1 and closes a last day with no bed.
  const home = places.find((p) => p.home && p.verified);
  const homeStop = home && { label: home.name, q: `${home.lat},${home.lng}`, pinned: true };

  days.forEach((d, i) => {
    const color = PALETTE[(d.day - 1) % PALETTE.length];
    const date = dateOf(d, r);
    const t0 = date ? Date.parse(`${date}T00:00:00Z`) / 1000 : (d.day - 1) * 86400;
    const { start, stops } = dayStops(d.schedule ?? [], places, { start: i ? camp(days[i - 1].overnight) : homeStop ?? null, end: camp(d.overnight) ?? (i === days.length - 1 && !d.overnight ? homeStop : null) });
    const all = [start, ...stops].filter(Boolean);
    // Skipping an unplaced stop can leave one place twice in a row (camp → ? → camp). A flight
    // to an unplaced airport still flies: the flag moves on to the next placed stop.
    const pinned = [], flyHop = [];
    let flying = false;
    for (const s of all) {
      flying ||= s.via === "fly";
      const p = s.pinned ? byQuery.get(s.q) : null;
      if (!p || p === pinned.at(-1)) continue;
      flyHop.push(flying && pinned.length > 0); pinned.push(p); flying = false;
    }
    // Last night's bed is TBD (or unplaced): start from where yesterday's line ended, so the
    // map doesn't skip the drive between them. A guess, so the leg says so.
    const startGuessed = !(start?.pinned) && lastPin && pinned.length > 0 && pinned[0] !== lastPin;
    if (startGuessed) { pinned.unshift(lastPin); flyHop.splice(1, 0, false); flyHop[0] = false; }
    const guessedFrom = startGuessed ? { day: lastPinDay, place: lastPin.name } : null; // can be days back, when the days between have no placed stop
    if (pinned.length) lastPin = pinned.at(-1), lastPinDay = d.day;
    const base = { trip: slug, day: d.day, date, title: d.title, color, lineColor: rgb(color), fillColor: rgb(color) };
    const road = routes.get(d.day);
    const { line, fly } = road ? joinParts(road.parts ?? [{ fly: false, line: road.line }])
      : joinParts(pinned.slice(1).map((p, k) => {
        const a = [pinned[k].lng, pinned[k].lat], b = [p.lng, p.lat];
        return flyHop[k + 1] ? { fly: true, line: arc(a, b) } : { fly: false, line: [a, b] };
      }));

    // The clock runs at constant speed along the line, so the trace moves like a car and
    // each pin appears when the line reaches it (its nearest vertex, searched in order).
    const cum = [0];
    for (let k = 1; k < line.length; k++) cum.push(cum[k - 1] + km(line[k - 1], line[k]));
    const total = cum.at(-1) || 1;
    const at = (k) => t0 + DAY0 + Math.round((SPAN * cum[k]) / total);
    let from = 0;
    pinned.forEach((p, k) => {
      let best = from;
      for (let j = from; j < line.length; j++) if (km(line[j], [p.lng, p.lat]) < km(line[best], [p.lng, p.lat])) best = j;
      from = best;
      const ts = line.length > 1 ? at(best) : t0 + DAY0;
      const isCamp = k === pinned.length - 1 && camp(d.overnight)?.label === p.name;
      flat.push(point(p, { ...base, seq: k + 1, role: isCamp ? "camp" : "stop", time: iso(ts), timestamp: ts }));
      seen.add(p.name);
    });

    if (line.length < 2) return;
    const inAir = (k) => fly.some(([a, b]) => k > a && k <= b);
    const flown = cum.reduce((a, c, k) => a + (k && inAir(k) ? c - cum[k - 1] : 0), 0);
    const bed = camp(d.overnight);
    const props = { ...base, kind: "leg", shape: road ? "road" : "straight", miles: Math.round((total - flown) / 1.609344),
      ...(fly.length ? { fly, flownMiles: Math.round(flown / 1.609344), flyHops: flyHop.flatMap((f, k) => (f ? [k + 1] : [])) } : {}),
      ...(bed?.standIn ? { bedStandIn: bed.label } : {}),
      ...((d.schedule ?? []).some((r) => r.kind === "ferry" && !/^(option|fallback)\b/i.test(r.time)) ? { planFerry: true } : {}), stops: pinned.length, startGuessed: !!startGuessed, ...(startGuessed ? { startFromDay: guessedFrom.day, startFrom: guessedFrom.place } : {}), skipped: all.filter((s) => !(s.pinned && byQuery.has(s.q))).length, stroke: color, "stroke-width": 3, ...(road ? { source: road.source } : {}) };
    flat.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: line } });
    trip.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: line.map(([x, y], k) => [x, y, 0, at(k)]) } });
  });

  // Verified places no day's schedule reaches still belong on the map.
  for (const p of places) if (p.verified && !seen.has(p.name)) flat.push(point(p, { trip: slug, day: null, date: null, role: "place", color: "#666666", fillColor: [102, 102, 102] }));

  const todo = places.filter((p) => !p.verified).map((p) => ({ trip: slug, group: p.group, name: p.name, maps: p.maps ?? null, days: p.days ?? null }));
  const drawn = new Set(trip.map((f) => f.properties.day));
  const noLine = days.map((d) => d.day).filter((n) => !drawn.has(n));
  const guessed = trip.filter((f) => f.properties.startGuessed).map((f) => [f.properties.day, f.properties.startFrom, f.properties.startFromDay]);
  return { flat, trip, todo, noLine, guessed, title: r.title, done: r.status === "done" };
}

const iso = (s) => new Date(s * 1000).toISOString().replace("T", " ").slice(0, 16);

function point(p, extra) {
  const props = { kind: "place", name: p.name, group: p.group, icon: p.icon ?? null, note: p.wpNote ?? p.note ?? null, source: p.source, days: p.days ?? null, ...extra };
  props["marker-color"] = props.color;
  return { type: "Feature", properties: props, geometry: { type: "Point", coordinates: [p.lng, p.lat] } };
}

/** trips/<slug>/routes.yaml → Map(day → { line, parts, source, file }). Every entry needs a source. */
export function loadRoutes(slug, readRel = read, exists = has) {
  const rel = `trips/${slug}/routes.yaml`;
  if (!exists(rel)) return new Map();
  const out = new Map();
  for (const e of YAML.parse(readRel(rel)) ?? []) {
    if (!e.source) throw new Error(`${rel}: day ${e.day} has no source (where the line came from)`);
    const files = [e.files ?? e.file].flat();
    const parts = files.flatMap((f) => gpxParts(readRel(`trips/${slug}/${f}`)));
    const { line } = joinParts(parts);
    if (line.length < 2) throw new Error(`${rel}: day ${e.day}'s GPX has no track or route points`);
    out.set(Number(e.day), { line, parts, source: e.source, file: files.join(", ") });
  }
  return out;
}

/** [1, 2, 3, 7] → "1–3, 7" */
const ranges = (ns) => ns.reduce((out, n) => { const last = out.at(-1); if (last && n === last[1] + 1) last[1] = n; else out.push([n, n]); return out; }, []).map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join(", ");

const fc = (features) => JSON.stringify({ type: "FeatureCollection", features });

/** Every trip → site/maps/. Returns the summary lines. With todoOnly, writes nothing and prints the unplaced list. */
export function writeMaps({ todoOnly = false } = {}) {
  const slugs = readdirSync(join(ROOT, "trips")).filter((s) => has(`trips/${s}/trip.md`)).sort();
  const all = { flat: [], trip: [], todo: [] };
  const lines = [];
  for (const slug of slugs) {
    const groups = has(`trips/${slug}/places.yaml`) ? YAML.parse(read(`trips/${slug}/places.yaml`)).groups ?? [] : [];
    const g = tripGeo(slug, read(`trips/${slug}/trip.md`), groups, loadRoutes(slug));
    all.flat.push(...g.flat); all.trip.push(...g.trip);
    if (!g.done) all.todo.push(...g.todo); // finished trips don't need pins
    if (!todoOnly) {
      mkdirSync(join(ROOT, "site/maps"), { recursive: true });
      writeFileSync(join(ROOT, `site/maps/${slug}.geojson`), fc(g.flat));
      writeFileSync(join(ROOT, `site/maps/${slug}-trip.geojson`), fc(g.trip));
    }
    const pts = g.flat.filter((f) => f.geometry.type === "Point").length;
    const legs = g.trip.length, road = g.trip.filter((f) => f.properties.shape === "road").length;
    lines.push(`  ${slug.padEnd(24)} ${String(pts).padStart(3)} pins · ${String(legs).padStart(2)} day lines (${road} road) · ${g.todo.length} unplaced`);
    // "0 unplaced" can still leave whole days off the map: say which, and which lines start from a guess.
    if (!g.done && g.noLine.length) lines.push(`  ${"".padEnd(24)} no line: ${ranges(g.noLine)}${g.guessed.length ? ` · guessed start: ${g.guessed.map(([d, at, f]) => `day ${d} (from ${at}, day ${f})`).join(", ")}` : ""}`);
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
  } else console.log(`${all.todo.length} places on upcoming trips still unplaced — node tools/geojson.mjs --todo lists them`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeMaps({ todoOnly: process.argv.includes("--todo") });
