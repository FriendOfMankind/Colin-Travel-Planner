#!/usr/bin/env node
/* kml.mjs — a trip for Google My Maps: the phone map, satellite included,
   that needs signal.

     node tools/kml.mjs <slug>     # writes site/maps/<slug>-lines.kml and <slug>-pins.kml
     node tools/kml.mjs            # every trip with something placed (build runs this)

   Two files per trip, from the same data geojson.mjs builds, each its own
   My Maps layer (one import makes one layer):
     <slug>-lines.kml   a line per day, colored by day (flights left out)
     <slug>-pins.kml    a pin per verified place
   My Maps keeps a line's color but draws every imported pin white
   (Colin's first import, 2026-10-31). So each feature carries data fields,
   which My Maps imports as table columns: `kind` (day line, bed, stop,
   off-plan), `day` (the line's day, a pin's first day) and `area` (its
   places.yaml group). "Group places by kind" on the pins layer colors them
   with a legend. A style applies to a whole layer, which is why the lines
   live apart: grouping them with the pins would repaint every day one color.

   Google's import rules (support.google.com/mymaps/answer/3024836, read
   2026-10-30): a KML up to 5 MB unzipped, no more than 2,000 rows, and
   folders, MultiGeometries and HTML balloons may not come through. So
   there are no folders, a day cut by a flight is two plain lines, and
   descriptions are plain text. A file over either limit is refused here.

   One pin per place, however many days reach it, with those days and its
   note. Nothing here invents a place: only verified pins and the day lines
   geojson.mjs already drew go in. */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { tripGeo, loadRoutes } from "./geojson.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const has = (rel) => existsSync(join(ROOT, rel));

export const LIMITS = { bytes: 5 * 1024 * 1024, rows: 2000 };
const CAMP = "#1b5e20", OFFPLAN = "#666666";

const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Titles and notes are Markdown; My Maps shows plain text.
const plain = (s) => String(s ?? "").replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
/** #rrggbb → KML's aabbggrr. */
export const kmlColor = (hex, alpha = "ff") => alpha + hex.slice(5, 7) + hex.slice(3, 5) + hex.slice(1, 3);
const coords = (line) => line.map(([x, y]) => `${+x.toFixed(6)},${+y.toFixed(6)}`).join(" ");
const dayList = (days) => (days.length ? `Day${days.length > 1 ? "s" : ""} ${days.join(", ")}` : "Not on a day");

/** A leg's ground pieces: the line cut at its flown ranges, which are dropped. */
export function groundParts(line, fly = []) {
  const cuts = [...new Set([0, ...fly.flat(), line.length - 1])].sort((a, b) => a - b);
  return cuts.slice(1).map((b, k) => ({ a: cuts[k], b }))
    .filter(({ a, b }) => !fly.some(([f0, f1]) => f0 === a && f1 === b))
    .map(({ a, b }) => line.slice(a, b + 1)).filter((l) => l.length >= 2);
}

/** tripGeo's output → { days, camps, stops }, each a list of Placemark strings plus their styles. */
/** <ExtendedData>: the columns My Maps styles and filters by. */
const fields = (o) => `<ExtendedData>${Object.entries(o).filter(([, v]) => v != null && v !== "").map(([k, v]) => `<Data name="${k}"><value>${xml(v)}</value></Data>`).join("")}</ExtendedData>`;

export function kmlLayers(g) {
  const days = [], camps = [], stops = [], styles = new Map();
  const style = (id, body) => (styles.set(id, `<Style id="${id}">${body}</Style>`), `#${id}`);

  for (const f of g.flat.filter((x) => x.properties.kind === "leg")) {
    const p = f.properties;
    const parts = groundParts(f.geometry.coordinates, p.fly);
    const url = style(`day-${p.day}`, `<LineStyle><color>${kmlColor(p.color)}</color><width>4</width></LineStyle>`);
    const desc = [p.date, `${p.miles} mi on the ground`, p.shape === "road" ? `Road line: ${p.source}` : "Straight pin-to-pin line, not a road",
      p.flownMiles ? `Flight (${p.flownMiles} mi) not drawn` : "", p.startGuessed ? `Starts where day ${p.day - 1} ended: that bed isn't decided` : "",
      p.bedStandIn ? `Ends at ${p.bedStandIn}, a stand-in for an unplaced bed` : "", p.skipped ? `${p.skipped} unplaced stop${p.skipped > 1 ? "s" : ""} skipped` : ""].filter(Boolean).join("\n");
    parts.forEach((line, k) => days.push(`<Placemark><name>${xml(`Day ${p.day} · ${plain(p.title)}${parts.length > 1 ? ` (part ${k + 1})` : ""}`)}</name><description>${xml(desc)}</description><styleUrl>${url}</styleUrl>${fields({ kind: "day line", day: p.day })}<LineString><tessellate>1</tessellate><coordinates>${coords(line)}</coordinates></LineString></Placemark>`));
  }

  // tripGeo puts a place down once per day that reaches it; the map wants it once.
  const byName = new Map();
  for (const f of g.flat.filter((x) => x.geometry.type === "Point")) {
    const p = f.properties, e = byName.get(p.name) ?? { p, at: f.geometry.coordinates, days: new Set(), nights: [] };
    if (p.day != null) e.days.add(p.day);
    if (p.role === "camp") e.nights.push(p.day);
    byName.set(p.name, e);
  }
  for (const e of byName.values()) {
    const ds = [...e.days].sort((a, b) => a - b), camp = e.nights.length > 0;
    const hex = camp ? CAMP : ds.length ? e.p.color : OFFPLAN;
    const url = style(`pin-${hex.slice(1)}`, `<IconStyle><color>${kmlColor(hex)}</color><Icon><href>https://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon></IconStyle>`);
    const desc = [camp ? `Bed, night${e.nights.length > 1 ? "s" : ""} ${e.nights.join(", ")}` : dayList(ds), plain(e.p.note), e.p.group ?? ""].filter(Boolean).join("\n");
    (camp ? camps : stops).push(`<Placemark><name>${xml(e.p.name)}</name><description>${xml(desc)}</description><styleUrl>${url}</styleUrl>${fields({ kind: camp ? "bed" : ds.length ? "stop" : "off-plan", day: ds[0], area: e.p.group })}<Point><coordinates>${coords([e.at])}</coordinates></Point></Placemark>`);
  }
  return { days, camps, stops, styles };
}

function doc(name, placemarks, styles) {
  const used = [...styles].filter(([id]) => placemarks.some((p) => p.includes(`#${id}<`))).map(([, s]) => s);
  return [`<?xml version="1.0" encoding="UTF-8"?>`, `<kml xmlns="http://www.opengis.net/kml/2.2">`, `<Document><name>${xml(name)}</name>`, ...used, ...placemarks, `</Document>`, `</kml>`, ""].join("\n");
}

/** One trip → { file name: KML text }, refused if it breaks My Maps' limits. */
export function tripKml(slug, g) {
  const { days, camps, stops, styles } = kmlLayers(g);
  const t = plain(g.title) || slug;
  const out = {
    [`${slug}-lines.kml`]: doc(`${t} · days`, days, styles),
    [`${slug}-pins.kml`]: doc(`${t} · places`, [...camps, ...stops], styles),
  };
  for (const [f, text] of Object.entries(out)) {
    const rows = (text.match(/<Placemark>/g) ?? []).length, bytes = Buffer.byteLength(text);
    if (rows > LIMITS.rows || bytes > LIMITS.bytes) throw new Error(`${f}: ${rows} rows, ${bytes} bytes; My Maps takes ${LIMITS.rows} rows and 5 MB`);
  }
  return out;
}

const geoOf = (slug) => {
  const groups = has(`trips/${slug}/places.yaml`) ? YAML.parse(read(`trips/${slug}/places.yaml`)).groups ?? [] : [];
  return tripGeo(slug, read(`trips/${slug}/trip.md`), groups, loadRoutes(slug));
};

/** site/maps/<slug>*.kml for the given trips (default: all with something placed). Returns the files written. */
export function writeKml(slugs) {
  slugs ??= readdirSync(join(ROOT, "trips")).filter((s) => has(`trips/${s}/trip.md`)).sort();
  mkdirSync(join(ROOT, "site/maps"), { recursive: true });
  const wrote = [];
  for (const slug of slugs) {
    if (!has(`trips/${slug}/trip.md`)) throw new Error(`no trip ${slug}`);
    const g = geoOf(slug);
    if (!g.flat.length) continue;
    for (const [f, text] of Object.entries(tripKml(slug, g))) writeFileSync(join(ROOT, "site/maps", f), text), wrote.push(f);
  }
  return wrote;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  const wrote = writeKml(slug ? [slug] : undefined);
  console.log(`wrote site/maps/: ${wrote.join(", ")}`);
}
