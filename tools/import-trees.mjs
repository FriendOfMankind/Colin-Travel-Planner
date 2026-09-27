#!/usr/bin/env node
/* import-trees.mjs — one-way bridge from the old Trees repo.

     TREES=../Trees node tools/import-trees.mjs kentucky-2026
     node tools/import-trees.mjs --me          # me/*.md, once

   Trips are re-runnable: Trees stays the live copy until cutover, so a trip
   can be re-imported after it changes there. me/*.md is different. Those
   files are meant to be curated by hand (and by /remember, /retro) from the
   day they land, so this refuses to overwrite one that exists unless
   --force is passed. Nothing here is retyped by hand; that is the point. */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { emitTrip, toYaml } from "./lib/format.mjs";
import { convertTrip, hub, treesCommit } from "./lib/trees.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const slugs = args.filter((a) => !a.startsWith("--"));

/* ---------------------------------------------------------------- writing */

function write(rel, text) {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
  console.log(`  wrote ${rel}`);
}
const stamp = `<!-- Imported from Trees@${treesCommit} by tools/import-trees.mjs. Edit here from now on; re-importing overwrites this file until cutover. -->`;

function importTrip(slug) {
  const t = convertTrip(slug);
  const dir = `trips/${slug}`;
  write(`${dir}/trip.md`, emitTrip({ registry: t.registry, page: t.page, header: stamp }));
  write(`${dir}/places.yaml`,
    `# ${t.registry.title} — every place, with its coordinate if one was verified.\n` +
    `# verified:false with null lat/lng is the CORRECT answer for an unlocated place.\n` +
    `# A coordinate needs a source. Never invent one.\n` +
    toYaml({ groups: t.places }) + "\n");
  if (t.sun) write(`${dir}/_gen/sun.json`, JSON.stringify({ generatedBy: "Trees tools/sun.mjs", ...t.sun }, null, 2) + "\n");
  const logPath = join(ROOT, dir, "log.md");
  if (!existsSync(logPath)) {
    write(`${dir}/log.md`, [
      "---", YAML.stringify({ trip: slug, kind: "log" }).trim(), "---", "",
      `# ${t.registry.title} — log`, "",
      "Dated entries, newest last. What happened, what it taught, and anything that should change the next trip. The retro goes at the bottom once the trip is over.", "",
      `## ${t.registry.updated} · Planning history (imported from Trees)`, "", t.history ?? "", "",
    ].join("\n"));
  } else console.log(`  kept ${dir}/log.md (exists — logs are never overwritten)`);
}

for (const s of slugs) {
  console.log(s);
  importTrip(s);
}
if (flag("--me")) (await import("./lib/import-me.mjs")).importMe({ hub, write, root: ROOT, force: flag("--force"), commit: treesCommit });
if (!slugs.length && !flag("--me")) console.log("usage: import-trees.mjs [--trees ../Trees] [--me [--force]] <slug>...");
