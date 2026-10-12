#!/usr/bin/env node
/* garden.mjs — the gardener's free pass: mechanical drift checks, no AI.

     node tools/garden.mjs                # report, today
     node tools/garden.mjs 2026-10-30     # as if it were that date
     node tools/garden.mjs --brief        # one line, for the briefing
     node tools/garden.mjs --json         # findings + the changed-file scope
     node tools/garden.mjs --scope        # files changed since the last run

   This is step 1 of /gardener (.claude/skills/gardener/SKILL.md). It costs
   nothing, so it runs first and the AI pass only spends tokens on what
   pattern-matching can't decide. The checks live in tools/lib/garden.mjs.
   Findings Colin dismissed are in garden/dismissed.yaml and stay hidden.
   Stale trip status and pending retros are tools/now.mjs's job, not this. */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import YAML from "yaml";
import { parseTrip } from "./lib/format.mjs";
import { gearQuestions, promises, logDrift, logEntries, pinMismatches, partition, fingerprint } from "./lib/garden.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const has = (rel) => existsSync(join(ROOT, rel));
const ls = (rel) => (has(rel) ? readdirSync(join(ROOT, rel)) : []);
const git = (...a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const TODAY = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? localIso(new Date());
const addDays = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + n * 864e5).toISOString().slice(0, 10);

/* ------------------------------------------------------------ gather */

const trips = ls("trips").filter((s) => has(`trips/${s}/trip.md`)).map((slug) => {
  const { registry: r } = parseTrip(read(`trips/${slug}/trip.md`));
  const start = r.start ?? null; // only dated trips can be "over"
  return { slug, status: r.status, start, end: start && r.days ? addDays(start, r.days - 1) : start };
});
const past = trips.filter((t) => t.end && t.end < TODAY && t.status !== "shelved");

// Current claims live here. Logs are history, docs and evals quote old values on purpose.
const claimFiles = [
  "CLAUDE.md", "bucket.yaml",
  ...ls("me").filter((f) => f.endsWith(".md")).map((f) => `me/${f}`),
  ...ls("kitchen").filter((f) => f.endsWith(".md")).map((f) => `kitchen/${f}`),
  ...ls("wishlist").filter((f) => f.endsWith(".md")).map((f) => `wishlist/${f}`),
  ...trips.flatMap((t) => [`trips/${t.slug}/trip.md`, `trips/${t.slug}/research.md`]),
].filter(has);
const files = Object.fromEntries(claimFiles.map((f) => [f, read(f)]));

/* ------------------------------------------------------------ check */

const findings = [];
if (has("me/gear.md")) findings.push(...gearQuestions(read("me/gear.md"), trips, TODAY));
// A finished trip's own files are history; their promises were about themselves.
const pastDirs = past.map((t) => `trips/${t.slug}/`);
for (const [f, text] of Object.entries(files)) if (!pastDirs.some((d) => f.startsWith(d))) findings.push(...promises(f, text, past));

let gitBlind = false;
for (const t of trips.filter((t) => t.status !== "shelved" && has(`trips/${t.slug}/log.md`))) {
  const changed = git("log", "-1", "--format=%cs", "--", `trips/${t.slug}/trip.md`);
  if (!changed) { gitBlind = true; continue; }
  findings.push(...logDrift(t.slug, logEntries(read(`trips/${t.slug}/log.md`)), changed));
}

const pins = has("garden/pins.yaml") ? YAML.parse(read("garden/pins.yaml")) ?? [] : [];
findings.push(...pinMismatches(pins, files));

const dismissed = has("garden/dismissed.yaml") ? YAML.parse(read("garden/dismissed.yaml")) ?? [] : [];
const { shown, hidden } = partition(findings, dismissed);

/* ------------------------------------------------------------ scope
   What the AI pass should read: files changed since the last recorded run
   (garden/runs.md's last row names its commit). First run, or a commit this
   clone doesn't have: everything, and say so. */

const runs = has("garden/runs.md") ? [...read("garden/runs.md").matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| `([0-9a-f]{7,40})` \|/gm)] : [];
const last = runs.at(-1);
let scope = { since: null, sinceDate: null, files: null, note: "" };
if (last && git("rev-parse", "-q", "--verify", `${last[2]}^{commit}`)) {
  const changed = git("diff", "--name-only", last[2], "HEAD").split("\n").filter((f) => claimFiles.includes(f) || /^trips\/[^/]+\/log\.md$/.test(f));
  scope = { since: last[2], sinceDate: last[1], files: changed, note: `${changed.length} file(s) changed since the last run (${last[1]}, ${last[2].slice(0, 7)})` };
} else {
  scope.note = last ? `last run's commit ${last[2].slice(0, 7)} isn't in this clone: sweep everything` : "no run recorded yet: sweep everything";
}

/* ------------------------------------------------------------ print */

if (flag("--json")) {
  console.log(JSON.stringify({ today: TODAY, findings: shown.map((f) => ({ ...f, fingerprint: fingerprint(f) })), hidden: hidden.length, scope, gitBlind }, null, 2));
  process.exit(0);
}
if (flag("--brief")) {
  if (shown.length) console.log(`- ${shown.length} mechanical drift finding(s): ${[...new Set(shown.map((f) => f.check))].join(", ")} → \`node tools/garden.mjs\` or /gardener`);
  process.exit(0);
}
if (flag("--scope")) {
  console.log(scope.note);
  for (const f of scope.files ?? []) console.log(`- ${f}`);
  process.exit(0);
}

const out = [`# Garden · ${TODAY} · mechanical pass`, ""];
if (!shown.length) out.push("Nothing mechanical. (That's the free half: contradictions in meaning need /gardener.)");
const label = { "gear-question-open": "Gear questions a finished trip should have answered", "promise-past-trip": "Promises about trips that are over", "log-drift": "Decisions logged after the plan last changed", "pin-mismatch": "Copies of a pinned fact that disagree" };
for (const [check, title] of Object.entries(label)) {
  const fs = shown.filter((f) => f.check === check);
  if (!fs.length) continue;
  out.push(`## ${title} (${fs.length})`);
  for (const f of fs) out.push(`- ${f.file}${f.line ? `:${f.line}` : ""} · ${f.says}`, `  ${f.why}`);
  out.push("");
}
if (hidden.length) out.push(`${hidden.length} dismissed finding(s) hidden (garden/dismissed.yaml).`);
if (gitBlind) out.push("⚠️ Some trips' git history isn't in this clone, so log-drift skipped them.");
out.push(`AI-pass scope: ${scope.note}.`);
console.log(out.join("\n"));
