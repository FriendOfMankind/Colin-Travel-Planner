#!/usr/bin/env node
/* mymaps.mjs — is Colin's Google My Map of a trip still the map the repo
   would draw today? My Maps is a one-time import (docs/MAPS.md): when pins,
   beds or roads change here, the phone map quietly goes stale.

     node tools/mymaps.mjs                      # every trip with `mymaps:` in its frontmatter (fetches from Google)
     node tools/mymaps.mjs <slug> <file.kml>    # compare a KML you already have
     node tools/mymaps.mjs --json               # machine-readable, for the workflow

   Fetching needs google.com, which a Claude session can't reach (a GitHub
   runner can: .github/workflows/mymaps.yml runs this weekly). In a session,
   Firecrawl can scrape https://www.google.com/maps/d/kml?mid=<id>&forcekml=1
   to a file, then pass the file. The map has to be shared "anyone with the
   link" for either to work.

   Compares by name: pins (missing, extra, moved more than 50 m) and day
   lines (missing, extra, or a different road). Exit code 1 when anything is
   stale, so the workflow can open an issue. The fix is always the same:
   re-import site/maps/<slug>-lines.kml and -pins.kml into that My Map. */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTrip } from "./lib/format.mjs";
import { tripKml, geoOf } from "./kml.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const has = (rel) => existsSync(join(ROOT, rel));

const unxml = (s) => s.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, "&").trim();
const pts = (c) => c.trim().split(/\s+/).map((p) => p.split(",").slice(0, 2).map((n) => +(+n).toFixed(6)));

/** KML text → { pins: Map(name → [lng, lat]), lines: Map(name → [[lng, lat], …]) }. Folders don't matter. */
export function readKml(text) {
  const pins = new Map(), lines = new Map();
  for (const [, pm] of text.matchAll(/<Placemark[^>]*>([\s\S]*?)<\/Placemark>/g)) {
    const name = unxml(/<name>([\s\S]*?)<\/name>/.exec(pm)?.[1] ?? "");
    const point = /<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(pm);
    const line = /<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/.exec(pm);
    if (point) pins.set(name, pts(point[1])[0]);
    else if (line) lines.set(name, pts(line[1]));
  }
  return { pins, lines };
}

const km = ([x1, y1], [x2, y2]) => Math.hypot((y2 - y1) * 111.2, (x2 - x1) * 111.2 * Math.cos((y1 * Math.PI) / 180));
const sameLine = (a, b) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);

/** What the repo would import now vs what the My Map holds. */
export function compare(want, got) {
  const out = { pinsMissing: [], pinsExtra: [], pinsMoved: [], linesMissing: [], linesExtra: [], linesChanged: [] };
  for (const [n, p] of want.pins) {
    if (!got.pins.has(n)) out.pinsMissing.push(n);
    else if (km(p, got.pins.get(n)) > 0.05) out.pinsMoved.push(`${n} (${km(p, got.pins.get(n)).toFixed(2)} km)`);
  }
  for (const n of got.pins.keys()) if (!want.pins.has(n)) out.pinsExtra.push(n);
  for (const [n, l] of want.lines) {
    if (!got.lines.has(n)) out.linesMissing.push(n);
    else if (!sameLine(l, got.lines.get(n))) out.linesChanged.push(n);
  }
  for (const n of got.lines.keys()) if (!want.lines.has(n)) out.linesExtra.push(n);
  return out;
}
export const staleCount = (d) => Object.values(d).reduce((n, a) => n + a.length, 0);

export function expected(slug) {
  const files = Object.values(tripKml(slug, geoOf(slug))).map(readKml);
  return { pins: new Map(files.flatMap((f) => [...f.pins])), lines: new Map(files.flatMap((f) => [...f.lines])) };
}

const LABEL = { pinsMissing: "pins not on the map yet", pinsExtra: "pins the repo no longer has", pinsMoved: "pins that moved", linesMissing: "days not on the map yet", linesExtra: "lines the repo no longer draws (or renamed)", linesChanged: "days whose road changed" };
export function report(slug, mid, d) {
  const n = staleCount(d);
  if (!n) return `✅ ${slug}: My Map matches the repo.`;
  const out = [`⚠️ ${slug}: My Map is behind the repo (${n} difference${n > 1 ? "s" : ""}). Re-import site/maps/${slug}-lines.kml and ${slug}-pins.kml into https://www.google.com/maps/d/edit?mid=${mid}`];
  for (const [k, label] of Object.entries(LABEL)) if (d[k].length) out.push(`  - ${d[k].length} ${label}: ${d[k].slice(0, 6).join("; ")}${d[k].length > 6 ? "; …" : ""}`);
  return out.join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), json = args.includes("--json");
  const [slugArg, fileArg] = args.filter((a) => !a.startsWith("--"));
  const slugs = slugArg ? [slugArg] : readdirSync(join(ROOT, "trips")).filter((s) => has(`trips/${s}/trip.md`)).sort();
  const results = [];
  for (const slug of slugs) {
    const mid = parseTrip(readFileSync(join(ROOT, "trips", slug, "trip.md"), "utf8")).registry.mymaps;
    if (!mid && !fileArg) continue;
    let text;
    if (fileArg) text = readFileSync(fileArg, "utf8");
    else {
      const res = await fetch(`https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`).catch((e) => ({ ok: false, statusText: e.message }));
      if (!res.ok) { results.push({ slug, mid, error: `couldn't fetch the map (${res.status ?? ""} ${res.statusText}). Is it shared "anyone with the link"?` }); continue; }
      text = await res.text();
    }
    const diff = compare(expected(slug), readKml(text));
    results.push({ slug, mid, stale: staleCount(diff), diff });
  }
  if (json) console.log(JSON.stringify(results, null, 2));
  else for (const r of results) console.log(r.error ? `❓ ${r.slug}: ${r.error}` : report(r.slug, r.mid, r.diff));
  process.exit(results.some((r) => r.stale || r.error) ? 1 : 0);
}
