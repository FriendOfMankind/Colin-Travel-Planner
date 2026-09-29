#!/usr/bin/env node
/* import-trees.mjs — one-way bridge from the old Trees repo.

     TREES=../Trees node tools/import-trees.mjs kentucky-2026
     node tools/import-trees.mjs --me          # me/*.md, once
     node tools/import-trees.mjs --wishlist    # every registry idea → wishlist/<slug>.md

   CUTOVER HAPPENED 2026-09-29. Trees is frozen and every file this writes is
   now curated here, so it refuses to overwrite anything that exists unless
   --force is passed. It stays for the record, and for the rare case of
   re-importing something that was never migrated. Nothing here is retyped by
   hand; that is the point. */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { emitTrip, toYaml } from "./lib/format.mjs";
import { convertTrip, hub, treesCommit } from "./lib/trees.mjs";
import { emitIdea } from "./lib/wishlist.mjs";
import { htmlToMd, htmlToMdInline } from "./lib/md.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const slugs = args.filter((a) => !a.startsWith("--"));

/* ---------------------------------------------------------------- writing */

function write(rel, text) {
  const p = join(ROOT, rel);
  if (existsSync(p) && !flag("--force") && !rel.includes("/_gen/")) {
    console.log(`  kept ${rel} (exists: curated here since cutover; --force to overwrite)`);
    return;
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
  console.log(`  wrote ${rel}`);
}
const stamp = `<!-- Imported from Trees@${treesCommit} at cutover (2026-09-29). Curated here now; Trees is frozen. -->`;

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

function importWishlist() {
  for (const r of hub.read("TRIPS").filter((t) => t.status === "wishlist")) {
    const { why, next, ...rest } = JSON.parse(JSON.stringify(r));
    const fm = {};
    for (const [k, v] of Object.entries(rest)) fm[k] = typeof v === "string" ? htmlToMdInline(v) : v;
    fm.source = `Trees@${treesCommit} data/trips.js (from the Sept 3 2026 bucket list; ✅ verified Sept 2026, 📋 verified earlier in 2026, ⚠️ unverified lead)`;
    write(`wishlist/${r.slug}.md`, emitIdea({ fm, why: htmlToMd(why), next: htmlToMd(next) }));
  }
}

for (const s of slugs) {
  console.log(s);
  importTrip(s);
}
if (flag("--me")) (await import("./lib/import-me.mjs")).importMe({ hub, write, root: ROOT, force: flag("--force"), commit: treesCommit });
if (flag("--wishlist")) importWishlist();
if (!slugs.length && !flag("--me") && !flag("--wishlist")) console.log("usage: import-trees.mjs [--force] [--me] [--wishlist] <slug>...");
