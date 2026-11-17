#!/usr/bin/env node
// A trip as a slideshow: for each day a cover, a slide per picture, and the day's warnings.
// Writes site/slides/<slug>.html, one self-contained page (pictures inside it) to publish as a
// private claude.ai page.
//
//   node tools/slides.mjs <slug>            build the deck
//   node tools/slides.mjs <slug> --list     the shot list: what each picture should show, and what it has
//   node tools/slides.mjs <slug> --find "Skellig Michael steps"   Commons candidates, with credit lines
//
// The words come from trips/<slug>/trip.md every time it's built. The pictures are listed in
// trips/<slug>/slides.yaml (tools/lib/slides.mjs has the format) and never live in the repo:
//   1. Colin's own pick, .cache/slides/<slug>/mine/<id>.<jpg|png|webp>, pulled from his Drive folder
//      (a session lists the folder into .cache/slides/<slug>/drive.json, then --pull fetches them);
//   2. else the shot's `commons:` file, fetched from upload.wikimedia.org and credited;
//   3. else a "photo wanted" slide that names the file to save.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseTrip } from "./lib/format.mjs";
import { checkSlides, deck, parseSlides } from "./lib/slides.mjs";
import { POSTER_DIR, dayColor } from "./lib/posters.mjs";

const slug = process.argv[2], has = (k) => process.argv.includes(k), arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (!slug || slug.startsWith("-")) { console.error('usage: node tools/slides.mjs <slug> [--list | --pull | --find "words"]'); process.exit(1); }
const UA = "trail-notes-slides/1.0 (personal trip deck)", CACHE = `.cache/slides/${slug}`;
// Wikimedia throttles this network hard (429 after a handful of requests), so: one request at a time, a pause after each, a long wait on a refusal.
const pause = (s) => execFileSync("sleep", [String(s)]);
const curl = (url, out) => { for (let t = 0; ; t++) { try { const b = execFileSync("curl", ["-sSfL", "-m", "90", "-A", UA, ...(out ? ["-o", out] : []), url], { maxBuffer: 2e8, stdio: ["ignore", "pipe", "pipe"] }); if (/wikimedia/.test(url)) pause(3); return b; } catch (e) { if (t >= 6 || !/ 429|timed out/.test(String(e.stderr))) throw e; pause(50); } } };
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

if (has("--find")) { // Commons search: landscape JPEGs, 1,600 px or wider. The API rate-limits hard; one query at a time.
  const j = JSON.parse(curl(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(arg("--find") + " filetype:bitmap")}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=extmetadata|size|mime&format=json`));
  for (const p of Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index)) { const i = p.imageinfo[0], m = i.extmetadata;
    if (i.mime === "image/jpeg" && i.width >= 1600) console.log(`commons: "${p.title}"\ncredit: "${(m.Artist?.value ?? "unknown").replace(/<[^>]+>/g, "").trim().slice(0, 60)} · ${m.LicenseShortName?.value}"   # ${i.width}×${i.height}\n`); }
  process.exit(0);
}

const tripFile = `trips/${slug}/trip.md`, file = `trips/${slug}/slides.yaml`;
if (!fs.existsSync(file)) { console.error(`${file} doesn't exist yet: list the shots there first (format in tools/lib/slides.mjs)`); process.exit(1); }
const trip = parseTrip(fs.readFileSync(tripFile, "utf8")), days = trip.page.days, spec = parseSlides(fs.readFileSync(file, "utf8"));
const front = fs.readFileSync(tripFile, "utf8").split(/^---$/m)[1] ?? "", fm = (k) => (front.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1] ?? "").replace(/^["']|["']$/g, "");
const problems = checkSlides(spec, days);
for (const p of problems) console.error("⚠ " + p);

const mineOf = (id) => ["jpg", "jpeg", "png", "webp"].map((e) => `${CACHE}/mine/${id}.${e}`).find((f) => fs.existsSync(f));
if (has("--pull")) { // Colin's picks: drive.json is [{ id, name }], listed by a session through the Drive connector
  const list = JSON.parse(fs.readFileSync(`${CACHE}/drive.json`, "utf8")); fs.mkdirSync(`${CACHE}/mine`, { recursive: true });
  for (const f of list) { const id = f.name.replace(/\.[a-z0-9]+$/i, "").toLowerCase(); if (!spec.shots.some((s) => s.id === id)) { console.log(`skipped ${f.name}: no shot with that id`); continue; }
    const out = `${CACHE}/mine/${id}.jpg`;
    try { curl(`https://drive.google.com/uc?export=download&id=${f.id}`, out); } catch {}
    const head = fs.existsSync(out) ? fs.readFileSync(out).subarray(0, 12) : Buffer.alloc(0), image = head[0] === 0xff || head.toString("latin1", 1, 4) === "PNG" || head.toString("latin1", 8, 12) === "WEBP";
    if (image) console.log(`pulled ${f.name}`); else { fs.rmSync(out, { force: true }); console.log(`couldn't fetch ${f.name}: Drive asked for a sign-in. Share the "Trip photos" folder as "Anyone with the link" (viewer).`); } }
  process.exit(0);
}
if (has("--list")) {
  for (const d of days) { const shots = spec.shots.filter((s) => s.day === d.day); if (!shots.length) continue;
    console.log(`\nDay ${d.day} · ${d.title}`);
    for (const s of shots) console.log(`  ${mineOf(s.id) ? "✓ yours  " : s.commons ? "· Commons" : "✗ WANTED "}  ${s.id}  —  ${s.shot}`); }
  process.exit(problems.length ? 1 : 0);
}

// ---- pictures ---------------------------------------------------------------
const commonsUrl = (title, width) => { const name = title.replace(/^File:/, "").replace(/ /g, "_"), h = createHash("md5").update(name).digest("hex"), base = `https://upload.wikimedia.org/wikipedia/commons`, e = encodeURIComponent(name);
  return width ? `${base}/thumb/${h[0]}/${h.slice(0, 2)}/${e}/${width}px-${e}` : `${base}/${h[0]}/${h.slice(0, 2)}/${e}`; };
fs.mkdirSync(`${CACHE}/commons`, { recursive: true });
const model = deck(spec, days), want = [];
for (const d of model) for (const s of d.slides) {
  s.src = mineOf(s.id) ?? null; s.mine = !!s.src;
  if (!s.src && s.commons) { const f = `${CACHE}/commons/${s.id}-${createHash("md5").update(s.commons).digest("hex").slice(0, 8)}.jpg`;
    if (!fs.existsSync(f)) { try { curl(commonsUrl(s.commons, 1280), f); } catch { try { curl(commonsUrl(s.commons), f); } catch { console.error(`⚠ ${s.id}: couldn't fetch ${s.commons}`); } } }
    if (fs.existsSync(f)) s.src = f; }
  if (!s.src) want.push(s);
}

// Shrink every picture to 1,400 px on its long side, in a browser canvas (no image library needed).
const require = createRequire(import.meta.url), { chromium } = require("playwright");
const browser = await chromium.launch(), page = await browser.newPage();
const shrink = async (file, long = 1400, q = 0.7) => { const out = `${file}.${long}.jpg`;
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs) {
    const mime = /\.png$/i.test(file) ? "image/png" : /\.webp$/i.test(file) ? "image/webp" : "image/jpeg";
    const b64 = await page.evaluate(async ([u, long, q]) => { const i = new Image(); i.src = u; await i.decode(); const r = Math.min(1, long / Math.max(i.naturalWidth, i.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(i.naturalWidth * r); c.height = Math.round(i.naturalHeight * r); c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", q).split(",")[1]; }, [`data:${mime};base64,${fs.readFileSync(file).toString("base64")}`, long, q]);
    fs.writeFileSync(out, Buffer.from(b64, "base64")); }
  return `data:image/jpeg;base64,${fs.readFileSync(out).toString("base64")}`; };
for (const d of model) for (const s of d.slides) if (s.src) { try { s.data = await shrink(s.src); } catch (e) { console.error(`⚠ ${s.id}: not a readable picture (${String(e.message).split("\n")[0]})`); want.push(s); } }
const posterFile = `${POSTER_DIR}/${slug}.jpg`, poster = fs.existsSync(posterFile) ? await shrink(posterFile, 1400, 0.72) : null;
await browser.close();

// ---- the page ---------------------------------------------------------------
const first = days[0].day, last = days[days.length - 1].day, col = (n) => dayColor(n, first, last);
const dateOf = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const title = fm("title") || slug, S = [];
const slide = (day, cls, inner, bg) => S.push(`<section class="slide ${cls}" data-day="${day}" style="--c:${day ? col(day) : "#e4b02e"}">${bg ? `<img class="bg" src="${bg}" alt="" loading="lazy">` : ""}${inner}</section>`);
slide(0, "trip", `<div class="body"><p class="eyebrow">${esc(fm("dates"))}</p><h1>${esc(title)}</h1><p class="tag">${esc(fm("subtitle"))}</p><p class="hint">${days.length} days · swipe, or use the arrow keys</p></div>`, poster);
for (const d of model) {
  const cover = d.slides.find((s) => s.data)?.data;
  const facts = [["Driving", d.driving], ["Sleep", d.bed], ["Eat", d.meals.join(" · ")], ["Slack", d.slack]].filter(([, v]) => v);
  slide(d.day, `cover${cover ? "" : " bare"}`, `<div class="body"><p class="eyebrow">Day ${String(d.day).padStart(2, "0")} · ${esc(dateOf(d.date))}${d.type ? ` · ${esc(d.type)}` : ""}</p><h2>${esc(d.title)}</h2><p class="tag">${esc(d.tagline)}</p><dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`, cover);
  for (const s of d.slides) {
    const meta = [s.when, s.soft ? "" : null].filter(Boolean).join(" · ");
    const text = `<div class="body"><p class="eyebrow">Day ${String(d.day).padStart(2, "0")}${meta ? ` · ${esc(meta)}` : ""}</p><h3>${esc(s.title)}</h3><p class="tag">${esc(s.text)}</p></div>`;
    if (s.data) slide(d.day, "photo", `${text}<p class="credit">${s.mine ? "Colin's pick" : `<a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(s.commons.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(s.credit)}</a>`}</p>`, s.data);
    else slide(d.day, "wanted", `<div class="frame"><p class="eyebrow">Photo wanted</p><p class="brief">${esc(s.shot)}</p><p class="file">save as <b>${esc(s.id)}</b></p></div>${s.text === s.shot ? text.replace(/<p class="tag">.*?<\/p>/, "") : text}`);
  }
  if (d.warnings.length) slide(d.day, "warn", `<div class="body"><p class="eyebrow">Day ${String(d.day).padStart(2, "0")} · watch for</p>${d.warnings.map((w) => `<div class="w">${w.lead ? `<h3>${esc(w.lead)}</h3>` : ""}<p>${esc(w.text)}</p></div>`).join("")}</div>`);
}
const credits = model.flatMap((d) => d.slides.filter((s) => s.data && !s.mine).map((s) => `<li><a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(s.commons.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(s.title)}</a> <span>${esc(s.credit)}</span></li>`));
if (credits.length) slide(0, "credits", `<div class="body"><p class="eyebrow">Pictures</p><h3>Credits</h3><p class="tag">From Wikimedia Commons, under the licence named with each. Resized for this deck.</p><ul>${credits.join("")}</ul></div>`);

const shell = fs.readFileSync("site/src/slides.html", "utf8");
const html = shell.replaceAll("__TITLE__", esc(title)).replace("__RAIL__", () => days.map((d) => `<button type="button" data-go="${d.day}" style="--c:${col(d.day)}" aria-label="Day ${d.day}: ${esc(d.title)}">${d.day}</button>`).join("")).replace("__SLIDES__", () => S.join("\n"));
fs.mkdirSync("site/slides", { recursive: true });
fs.writeFileSync(`site/slides/${slug}.html`, html);
const n = model.reduce((a, d) => a + d.slides.length, 0);
console.log(`wrote site/slides/${slug}.html (${(html.length / 1e6).toFixed(1)} MB): ${S.length} slides, ${n - want.length} of ${n} pictures in${want.length ? `; wanted: ${want.map((s) => s.id).join(", ")}` : ""}`);
if (html.length > 15.5e6) console.error("⚠ over the 16 MB page limit: split the deck or lower the picture size");
