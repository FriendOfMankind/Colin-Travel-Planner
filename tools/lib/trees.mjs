/* trees.mjs — reading the old Trees repo and converting it. Pure: nothing
   here writes a file, so tools/test/import.test.mjs can use it directly.

   The Trees checkout is found at $TREES, else ../Trees next to this repo. */

import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { htmlToMd, htmlToMdInline } from "./md.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TREES = resolve(process.env.TREES ?? join(ROOT, "..", "Trees"));

/* ---------------------------------------------------------- Trees loading */

function evalScripts(files) {
  const sandbox = { window: {}, document: { documentElement: { style: { setProperty() {} } } } };
  vm.createContext(sandbox);
  for (const f of files) vm.runInContext(readFileSync(join(TREES, f), "utf8"), sandbox, { filename: f });
  sandbox.read = (n) => vm.runInContext(`typeof ${n} !== "undefined" ? ${n} : undefined`, sandbox);
  return sandbox;
}
export const hub = evalScripts(["js/themes.js", "data/profile.js", "data/meals.js", "data/trips.js"]);
export const treesCommit = (() => {
  try {
    const head = readFileSync(join(TREES, ".git/HEAD"), "utf8").trim();
    const ref = head.startsWith("ref: ") ? readFileSync(join(TREES, ".git", head.slice(5)), "utf8").trim() : head;
    return ref.slice(0, 7);
  } catch { return "unknown"; }
})();

/* ------------------------------------------------------------ conversion */

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };
/** "Tue Sept 22, 2026" → "2026-09-22". Throws rather than guess. */
export function isoFromLabel(label) {
  const m = /([A-Z][a-z]+)\.? (\d{1,2}), (\d{4})/.exec(label);
  if (!m || !MONTHS[m[1]]) throw new Error(`Can't read a date from "${label}"`);
  return `${m[3]}-${String(MONTHS[m[1]]).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

/** Walk a value converting every string; `inline` keys can't hold line breaks. */
function convert(v, inline = false) {
  if (typeof v === "string") return inline ? htmlToMdInline(v) : htmlToMd(v);
  if (Array.isArray(v)) return v.map((x) => convert(x, inline));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, convert(x, inline)]));
  return v;
}

/** One trip's raw TRIP_DATA from Trees, as plain data. */
export function tripData(slug) {
  return JSON.parse(JSON.stringify(evalScripts(["js/themes.js", `trips/${slug}/data.js`]).window.TRIP_DATA));
}

/** Trees TRIP_DATA → the shape emitTrip takes. Exported for the round-trip test. */
export function convertTrip(slug) {
  const trips = hub.read("TRIPS");
  const reg = JSON.parse(JSON.stringify(trips.find((t) => t.slug === slug)));
  if (!reg) throw new Error(`${slug} is not in Trees' registry`);
  const src = readFileSync(join(TREES, "trips", slug, "data.js"), "utf8");
  const data = tripData(slug);

  delete reg.page; // derivable: trips/<slug>/
  const { slug: _s, stats, overviewCards, route, footerNote, ...meta } = data.meta;
  const page = {
    meta: { ...convert(meta, true), stats: convert(stats, true), route: htmlToMd(route), overviewCards: convert(overviewCards) },
    days: data.days?.map((d) => {
      const { day, date, title, schedule, meals, highlights, warnings, ...rest } = d;
      return {
        day, title, date: isoFromLabel(date), ...convert(rest, true),
        schedule: convert(schedule, true), meals: convert(meals, true),
        highlights: htmlToMd(highlights), warnings: htmlToMd(warnings),
      };
    }),
    lodging: data.lodging && convert(data.lodging, true),
    hikes: data.hikes && { ...convert(data.hikes, true), title: "Hikes & Trails", summary: htmlToMd(data.hikes.summary) },
    weather: data.weather && convert(data.weather, true),
    weatherNote: htmlToMd(data.weatherNote),
    provisions: data.provisions && {
      ...convert(data.provisions),
      cooler: convert(data.provisions.cooler, true),
      lists: convert(data.provisions.lists, true),
    },
    packing: convert(data.packing, true),
    reservations: convert(data.reservations, true),
    openQuestions: data.openQuestions?.map((q) => ({ question: htmlToMdInline(q.question), blocks: htmlToMdInline(q.blocks), detail: htmlToMd(q.detail) })),
    placesNote: htmlToMd(data.placesNote),
    offlineRegions: htmlToMd(data.offlineRegions),
    notes: data.notes?.map((n) => ({ heading: htmlToMdInline(n.heading), body: htmlToMd(n.body) })),
  };
  for (const k of Object.keys(page)) if (page[k] == null) delete page[k];

  // The data file's opening comment is the trip's planning history. It goes
  // to log.md, where history belongs, not into the plan.
  const history = /^\/\*[=\s]*([\s\S]*?)\s*=*\*\//.exec(src)?.[1]
    .split("\n").map((l) => l.replace(/^   ?/, "")).join("\n").trim();

  return {
    registry: { ...convert(reg, true), map: data.map, sunSites: data.sunMoonSites },
    page,
    places: mergePlaces(data.places ?? [], data.waypoints ?? []),
    sun: data.sunMoon ? { note: htmlToMd(data.sunMoonNote), rows: convert(data.sunMoon, true) } : null,
    history,
    footerNote: footerNote && htmlToMd(footerNote),
  };
}

/** One entry per place: the field view (maps search) and the coordinate
    (verified or not) were two lists in Trees that had to be kept in step by
    hand. Matched on name with emoji and stars stripped; anything that fails
    to match is kept, never dropped. */
export function mergePlaces(groups, waypoints) {
  const key = (s) => s.replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
  const wp = new Map(waypoints.map((w) => [key(w.name), w]));
  const used = new Set();
  const out = groups.map((g) => ({
    group: g.group,
    places: g.items.map((it) => {
      const w = wp.get(key(it.name));
      const p = { name: it.name.replace(/^⭐\s*/, "") };
      if (it.name.startsWith("⭐")) p.star = true;
      if (it.note) p.note = htmlToMdInline(it.note);
      if (it.maps) p.maps = it.maps;
      if (w) {
        used.add(key(w.name));
        Object.assign(p, coordOf(w));
      } else {
        Object.assign(p, { verified: false, lat: null, lng: null });
      }
      return p;
    }),
  }));
  const loose = waypoints.filter((w) => !used.has(key(w.name)));
  if (loose.length) {
    out.push({ group: "Waypoints with no field entry", places: loose.map((w) => ({ name: w.name, ...coordOf(w) })) });
  }
  return out;
}
function coordOf(w) {
  const o = { verified: !!w.verified, lat: w.lat ?? null, lng: w.lng ?? null };
  if (w.source) o.source = htmlToMdInline(w.source);
  if (w.icon) o.icon = w.icon;
  if (w.days) o.days = w.days;
  if (w.notes) o.wpNote = htmlToMdInline(w.notes);
  return o;
}

