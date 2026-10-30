#!/usr/bin/env node
/* pack.mjs — an offline pack for one trip: what to carry on the phone
   when there's no signal.

     node tools/pack.mjs <slug>     # writes site/packs/<slug>.{html,gpx}
     node tools/pack.mjs <slug> --pdf   # also renders <slug>.pdf (Playwright)

   The HTML is the whole trip.md rendered as one plain page, plus a places
   table. The GPX holds only verified places, so Organic Maps (or any GPX
   app) shows real pins and nothing guessed, plus one track per day that
   routes.yaml gives a sourced road line (straight pin-to-pin lines and flights stay out). Upload both to Google Drive and
   mark them "available offline". Nothing here invents content. */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import YAML from "yaml";
import { marked } from "marked";
import { splitFrontmatter } from "./lib/format.mjs";
import { loadRoutes } from "./geojson.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const xml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "### Day N — date · Title" headings → Map(day → title). */
export function dayTitles(body) {
  return new Map([...body.matchAll(/^###\s+Day\s+(\d+)\s+—\s+[\d-]+\s+·\s+(.+)$/gm)].map((m) => [Number(m[1]), m[2].trim()]));
}

/** places.yaml groups (+ loadRoutes' Map) → GPX text: a waypoint per verified place, a track per routed day. */
export function toGpx(name, groups, routes = new Map(), titles = new Map()) {
  const pts = groups.flatMap((g) => g.places.filter((p) => p.verified && p.lat != null && p.lng != null).map((p) => ({ ...p, group: g.group })));
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="colin-travel-planner" xmlns="http://www.topografix.com/GPX/1/1">`,
    `<metadata><name>${xml(name)}</name></metadata>`,
    ...pts.map((p) => `<wpt lat="${p.lat}" lon="${p.lng}"><name>${xml(p.name)}</name><desc>${xml([p.group, p.days ? `Day ${p.days}` : "", p.wpNote ?? ""].filter(Boolean).join(" · "))}</desc></wpt>`),
    ...[...routes].sort(([a], [b]) => a - b).map(([day, r]) => [
      `<trk><name>${xml([`Day ${day}`, titles.get(day)].filter(Boolean).join(" · "))}</name><desc>${xml(r.source)}</desc>`,
      // Ground only, one segment per stretch: a flight isn't something to follow on the phone.
      ...(r.parts ?? [{ line: r.line }]).filter((pt) => !pt.fly).map((pt) => `<trkseg>\n${pt.line.map(([lng, lat]) => `<trkpt lat="${lat}" lon="${lng}"/>`).join("\n")}\n</trkseg>`),
      `</trk>`].join("\n")),
    `</gpx>`, "",
  ].join("\n");
}

function packHtml(title, body, groups) {
  const rows = groups.flatMap((g) => g.places.map((p) =>
    `<tr><td>${xml(p.name)}</td><td>${xml(p.days ?? "")}</td><td>${p.verified ? `${p.lat}, ${p.lng}` : "not verified"}</td><td>${xml(p.maps ?? "")}</td></tr>`));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${xml(title)} · offline pack</title>
<style>body{font:15px/1.45 -apple-system,system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:16px;color:#111;background:#fff}
pre,code{white-space:pre-wrap;font-size:13px}pre{background:#f4f4f4;padding:8px;border-radius:6px}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #ccc;padding:4px;vertical-align:top}
h3{border-top:1px solid #ddd;padding-top:10px}@media print{h3{break-before:auto}pre{break-inside:avoid}}</style></head><body>
<p><em>Offline pack, generated ${new Date().toISOString().slice(0, 10)} from trip.md. If the repo changed since, regenerate it.</em></p>
${marked.parse(body)}
<h2>Places</h2><table><tr><th>Place</th><th>Day</th><th>Coordinate</th><th>Maps search</th></tr>${rows.join("")}</table>
</body></html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug || !existsSync(join(ROOT, "trips", slug, "trip.md"))) { console.error("usage: node tools/pack.mjs <slug> [--pdf]"); process.exit(1); }
  const { data, body } = splitFrontmatter(readFileSync(join(ROOT, "trips", slug, "trip.md"), "utf8"));
  const pf = join(ROOT, "trips", slug, "places.yaml");
  const groups = existsSync(pf) ? YAML.parse(readFileSync(pf, "utf8")).groups ?? [] : [];
  const dir = join(ROOT, "site", "packs"); mkdirSync(dir, { recursive: true });
  const html = join(dir, `${slug}.html`), gpx = join(dir, `${slug}.gpx`);
  writeFileSync(html, packHtml(data.title, body, groups));
  const routes = loadRoutes(slug);
  writeFileSync(gpx, toGpx(data.title, groups, routes, dayTitles(body)));
  const n = (readFileSync(gpx, "utf8").match(/<wpt /g) ?? []).length;
  console.log(`wrote ${html}\nwrote ${gpx} (${n} verified pins, ${routes.size} road lines)`);
  if (process.argv.includes("--pdf")) {
    // Playwright is preinstalled globally in Claude's sandbox, not a dependency here.
    const { chromium } = createRequire(import.meta.url)("playwright");
    const browser = await chromium.launch(); const page = await browser.newPage();
    await page.goto(`file://${html}`); await page.pdf({ path: join(dir, `${slug}.pdf`), format: "Letter", margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" } });
    await browser.close(); console.log(`wrote ${join(dir, `${slug}.pdf`)}`);
  }
}
