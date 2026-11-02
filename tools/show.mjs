#!/usr/bin/env node
/* show.mjs — read one part of a trip (or any Markdown file) instead of all of
   it. Trip files run to 100 KB (~25k tokens); a day is ~2 KB.

     node tools/show.mjs rockies                    # the map: every heading, its lines and size
     node tools/show.mjs rockies day 5              # one day
     node tools/show.mjs rockies 2027-07-20         # the day with that date
     node tools/show.mjs rockies hikes              # any heading containing "hikes", with its subsections
     node tools/show.mjs rockies front              # the frontmatter (registry facts, bookings)
     node tools/show.mjs rockies --log decided      # log.md entries whose heading says "decided"
     node tools/show.mjs rockies --research smoke   # research-log.md (the sweeps' raw findings)
     node tools/show.mjs rockies --log --last 5     # the newest 5 log entries
     node tools/show.mjs me/gear.md bike            # any file path works too

   The trip can be a slug or any unique part of one ("rockies", "dingle").
   Wishlist slugs work as well. Output starts with `path:start-end` so an
   edit can go straight to the right lines. */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sections, slice, find } from "./lib/sections.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const has = (rel) => existsSync(join(ROOT, rel));
const die = (msg) => { console.error(msg); process.exit(1); };

const args = process.argv.slice(2);
const FILES = { "--log": "log.md", "--research": "research-log.md", "--tree": "research.md", "--trip": "trip.md" };
const pick = args.find((a) => a in FILES);
const lastIx = args.indexOf("--last");
const last = lastIx >= 0 ? Number(args[lastIx + 1]) || 5 : null;
const rest = args.filter((a, i) => !(a in FILES) && a !== "--last" && !(lastIx >= 0 && i === lastIx + 1));
const [target, ...q] = rest;
if (!target) die("usage: node tools/show.mjs <trip|path> [day N | YYYY-MM-DD | heading text | front] [--log|--research|--tree] [--last N]");

function resolve(t) {
  if (has(t) && t.endsWith(".md")) return t;
  const trips = has("trips") ? readdirSync(join(ROOT, "trips")).filter((s) => has(`trips/${s}/trip.md`)) : [];
  const wish = has("wishlist") ? readdirSync(join(ROOT, "wishlist")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)) : [];
  const exact = trips.find((s) => s === t);
  if (exact) return `trips/${exact}/${FILES[pick] ?? "trip.md"}`;
  if (wish.includes(t)) return `wishlist/${t}.md`;
  // A trip beats an idea: "sky" is Sky Islands, not the Skye wishlist file.
  const tripHits = trips.filter((s) => s.includes(t)).map((s) => `trips/${s}/${FILES[pick] ?? "trip.md"}`);
  if (tripHits.length === 1) return tripHits[0];
  const hits = [...tripHits, ...wish.filter((s) => s.includes(t)).map((s) => `wishlist/${s}.md`)];
  if (hits.length === 1) return hits[0];
  const shown = hits.slice(0, 8).join(", ") + (hits.length > 8 ? `, and ${hits.length - 8} more` : "");
  die(hits.length ? `"${t}" matches several: ${shown}` : `no trip, idea or file matches "${t}"`);
}

const path = resolve(target);
if (!has(path)) die(`${path} doesn't exist`);
const text = readFileSync(join(ROOT, path), "utf8");
const list = sections(text);
const kb = (s) => `${(slice(text, s).length / 1024).toFixed(1)} KB`;

if (last) {
  const dated = list.filter((s) => s.level === 2 && /^\d{4}-\d{2}-\d{2}/.test(s.title)).slice(-last);
  for (const s of dated) console.log(`── ${path}:${s.start}-${s.end}\n${slice(text, s)}\n`);
  process.exit(0);
}

if (!q.length) {
  console.log(`${path} · ${(text.length / 1024).toFixed(0)} KB · ${text.split("\n").length} lines`);
  for (const s of list) console.log(`${String(s.start).padStart(5)}-${String(s.end).padEnd(5)} ${kb(s).padStart(8)}  ${"  ".repeat(Math.max(0, s.level - 1))}${s.level ? "#".repeat(s.level) + " " : ""}${s.title}`);
  process.exit(0);
}

const hits = find(list, q.join(" "));
if (!hits.length) die(`nothing in ${path} matches "${q.join(" ")}". Run without a query to see the headings.`);
// A match inside another match is already printed with its parent.
const top = hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.level < h.level));
for (const s of top) console.log(`── ${path}:${s.start}-${s.end}\n${slice(text, s)}\n`);
