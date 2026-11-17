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
//   1. Colin's own pick, .cache/slides/<slug>/mine/<id>.<jpg|png|webp>. He adds them in the Photo
//      Ledger (tools/photosheet.html; --ledger prints the rows to load into it) and a session saves
//      each stored picture into that folder. The older way, a Drive folder and --pull, still works;
//   2. else the shot's `commons:` file, fetched from upload.wikimedia.org and credited;
//   3. else a "photo wanted" slide that names the file to save.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseTrip } from "./lib/format.mjs";
import { beds, checkSlides, deck, lede, parseSlides, plain } from "./lib/slides.mjs";
import { POSTER_DIR, dayColor } from "./lib/posters.mjs";

const slug = process.argv[2], has = (k) => process.argv.includes(k), arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (!slug || slug.startsWith("-")) { console.error('usage: node tools/slides.mjs <slug> [--list | --ledger | --adopt <rows dir> <pictures dir>]'); process.exit(1); }
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
if (has("--ledger")) { // the rows to load into the Photo Ledger (tools/photosheet.html), as ArtifactData batch operations
  const title = fm("title") || slug, where = fm("country"), ops = [{ op: "set", collection: "trips", doc_id: slug, data: { title } }];
  let order = 0;
  for (const d of deck(spec, days)) for (const s of d.slides.filter((x) => x.kind === "photo")) ops.push({ op: "update", collection: "shots", doc_id: `${slug}--${s.id}`, data: { trip: slug, id: s.id, day: d.day, dayTitle: d.title, order: order++, title: s.title, shot: s.shot, q: [s.title.replace(/^.*: /, ""), where].filter(Boolean).join(" ") } });
  console.log(JSON.stringify(ops)); process.exit(0);
}
if (has("--adopt")) { // --adopt <rows dir> <pictures dir>: the Photo Ledger's rows (ArtifactData list, out_dir) and its stored pictures (Artifact read, path = asset id), filed as Colin's picks
  const i = process.argv.indexOf("--adopt"), rows = process.argv[i + 1], pics = process.argv[i + 2], files = fs.readdirSync(pics); let n = 0;
  fs.mkdirSync(`${CACHE}/mine`, { recursive: true });
  for (const f of fs.readdirSync(rows).filter((f) => f.startsWith(`${slug}--`) && f.endsWith(".json"))) { const j = JSON.parse(fs.readFileSync(path.join(rows, f), "utf8")), row = j.data ?? j;
    if (!row.asset) continue; const pic = files.find((x) => x.startsWith(row.asset));
    if (!pic) { console.log(`${row.id}: stored picture ${row.asset} isn't in ${pics} yet`); continue; }
    for (const e of ["jpg", "jpeg", "png", "webp"]) fs.rmSync(`${CACHE}/mine/${row.id}.${e}`, { force: true });
    fs.copyFileSync(path.join(pics, pic), `${CACHE}/mine/${row.id}${path.extname(pic).toLowerCase() || ".jpg"}`); n++; }
  console.log(`${n} of Colin's pictures filed in ${CACHE}/mine`); process.exit(0);
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
for (const d of model) for (const s of d.slides) { if (s.kind !== "photo") continue;
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
// Line drawings for the kinds of thing a day holds. 24-unit grid, drawn here: no outside artwork.
const I = {
  fly: "M12 2.5c.8 0 1.4.9 1.4 2v4.6l7.1 4.4v1.8l-7.1-2.2v4.4l2.1 1.6v1.4L12 19.6l-3.5.9v-1.4l2.1-1.6v-4.4l-7.1 2.2v-1.8l7.1-4.4V4.5c0-1.1.6-2 1.4-2z",
  travel: "M5 17V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5V17zM5 12h14M3.5 17h17M7.5 17v2M16.5 17v2M8 14.6h.01M16 14.6h.01M3 9v3M21 9v3",
  drive: "M3.5 16.5v-4l2-5a1.5 1.5 0 0 1 1.4-1h10.2a1.5 1.5 0 0 1 1.4 1l2 5v4zM3.5 12.5h17M6 16.5v2M18 16.5v2M7 14.6h.01M17 14.6h.01",
  ferry: "M4 14l1.6 5h12.8L20 14zM6.5 14V9.5h11V14M9.5 9.5v-4h5v4M12 5.5V3M2.5 21.5c1.6-1.2 3.2-1.2 4.8 0s3.2 1.2 4.7 0 3.2-1.2 4.8 0 3.1 1.2 4.7 0",
  hike: "M2.5 19.5l6-10.5 3.2 5 2.3-3.5 7.5 9zM8.5 9l1.6-2.6M14 10.5l1.4-2",
  walk: "M12.5 5.2a1.4 1.4 0 1 0 0-.1M9 21l2.5-6-2-3 1-4.5 3.5 1 2 3.5M10.5 7.5L7.5 10M13.5 15l2.5 6",
  food: "M6 3v7a2 2 0 0 0 4 0V3M8 3v18M16.5 3c-2 1.5-2.5 4-2.5 7h2.5zM16.5 10v11",
  music: "M9 18.5V5.5l10-2v13M9 18.5a2.4 2.4 0 1 1-4.800 0 2.4 2.4 0 0 1 4.800 0zM19 16.500a2.400 2.400 0 1 1-4.800 0 2.400 2.400 0 0 1 4.800 0z",
  ruins: "M5 21V8l2-1.5V4h2v2h2V4h2v2h2V4h2v2.500L19 8v13zM10 21v-4.500a2 2 0 0 1 4 0V21M3 21h18",
  bed: "M3 19v-12M3 15.500h18V19M21 15.500v-2.500a3 3 0 0 0-3-3h-7v5.500M6.800 13.200a1.600 1.600 0 1 0 0-.100",
  stop: "M12 21.500s-6.500-6.300-6.500-11a6.500 6.500 0 0 1 13 0c0 4.700-6.500 11-6.500 11zM12 12.300a2.200 2.200 0 1 0 0-4.400 2.200 2.200 0 0 0 0 4.400z",
  sun: "M3 17.500h18M6.500 17.500a5.500 5.500 0 0 1 11 0M12 6.500V4M5.300 10.300L3.600 8.600M18.700 10.300l1.700-1.700M8 21h8",
  camp: "M3 20L12 5l9 15zM12 5V3M9.500 20l2.500-5 2.500 5",
  note: "M6 3.500h9l4 4V20.500H6zM15 3.500v4h4M9 12h7M9 15.500h7",
  sport: "M6 21V3.500M6 4.500h11l-2.500 3.500 2.500 3.500H6M3.500 21h5",
  ride: "M6 19.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM18 19.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7zM6 16l4-7h6l2 7M10 9l3 7M9 6h3",
};
Object.assign(I, { boat: I.ferry, paddle: I.ferry, sunrise: I.sun, sunset: I.sun, wake: I.sun, fossil: I.stop, cave: I.hike, geology: I.hike, activity: I.stop, shop: I.stop, rest: I.bed });
const icon = (kind, cls = "") => `<svg class="ic ${cls} k-${I[kind] === I.fly ? "fly" : "other"}" viewBox="0 0 24 24" aria-hidden="true"><path d="${(I[kind] ?? I.stop).replace(/(\d)\.(\d)00\b/g, "$1.$2")}"/></svg>`;
const title = fm("title") || slug, S = [], meta = trip.page.meta ?? {};
const slide = (day, cls, inner, bg) => S.push(`<section class="slide ${cls}" data-day="${day}" style="--c:${day ? col(day) : "#e4b02e"}">${bg ? `<img class="bg" src="${bg}" alt="" loading="lazy">` : ""}${inner}</section>`);
const eyebrow = (d, more) => `<p class="eyebrow">Day ${String(d.day).padStart(2, "0")}${more ? ` · ${esc(more)}` : ""}</p>`;
slide(0, "trip", `<div class="body"><p class="eyebrow">${esc(fm("dates"))}</p><h1>${esc(title)}</h1><p class="tag">${esc(plain(meta.subtitle ?? fm("subtitle")))}</p><p class="hint">${days.length} days · swipe, or use the arrow keys</p></div>`, poster);
// the trip before the days: the route, how you get there and around, where you sleep, what's booked
if (poster) slide(0, "map", `<img class="fit" src="${poster}" alt="The route poster: ${esc(title)}"><div class="body"><p class="eyebrow">The route</p>${meta.route ? `<p class="tag">${esc(lede(meta.route, 330))}</p>` : ""}</div>`);
if (meta.gettingThere || meta.vehicle) slide(0, "leg", `${icon("fly", "big")}<div class="body"><p class="eyebrow">Getting there and around</p>${meta.gettingThere ? `<h3>Flights</h3><p class="tag">${esc(lede(meta.gettingThere, 300))}</p>` : ""}${meta.vehicle ? `<h3>Wheels</h3><p class="tag">${esc(lede(meta.vehicle, 300))}</p>` : ""}</div>`);
{ const b = beds(model); if (b.length) slide(0, "list", `<div class="body"><p class="eyebrow">Where you sleep</p><h3>${b.length} beds, ${model.filter((d) => d.bedName).length} nights</h3><ul class="rows">${b.map((x) => `<li style="--c:${col(x.from)}"><span class="t">${x.from === x.to ? `Night ${x.from}` : `Nights ${x.from}–${x.to}`}</span>${icon("bed")}<span class="n">${esc(x.name)}<small>${esc(x.place)}</small></span></li>`).join("")}</ul></div>`); }
{ const bk = trip.registry.booking ?? []; if (bk.length) slide(0, "list", `<div class="body"><p class="eyebrow">Bookings · as the plan has them</p><h3>${bk.filter((x) => x.booked).length} of ${bk.length} booked</h3><ul class="rows">${bk.map((x) => `<li class="${x.booked ? "yes" : "no"}"><span class="t">${x.booked ? "booked" : "not yet"}</span><span class="n">${esc(plain(x.what))}</span></li>`).join("")}</ul></div>`); }
for (const d of model) {
  const cover = d.slides.find((s) => s.data)?.data, lead = d.slides.find((s) => s.kind === "leg")?.rowKind ?? d.plan.find((r) => I[r.kind])?.kind;
  const facts = [["Driving", d.driving], ["Sleep", d.bed], ["Eat", d.meals.join(" · ")], ["Slack", d.slack]].filter(([, v]) => v);
  slide(d.day, `cover${cover ? "" : " bare"}`, `${cover ? "" : icon(lead, "big")}<div class="body">${eyebrow(d, `${dateOf(d.date)}${d.type ? ` · ${d.type}` : ""}`)}<h2>${esc(d.title)}</h2><p class="tag">${esc(d.tagline)}</p><dl>${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>`, cover);
  if (d.plan.length > 1) slide(d.day, "list", `<div class="body">${eyebrow(d, "the plan")}<h3>${esc(d.title)}</h3><ul class="rows plan">${d.plan.map((r) => `<li class="${r.soft ? "soft" : ""}"><span class="t">${esc(r.time)}</span>${icon(r.kind)}<span class="n">${esc(r.name)}${r.warn ? ` <b class="flag">careful</b>` : ""}</span></li>`).join("")}</ul></div>`);
  for (const s of d.slides) {
    const text = `<div class="body">${eyebrow(d, s.when)}<h3>${esc(s.title)}</h3>${s.text ? `<p class="tag">${esc(s.text)}</p>` : ""}</div>`;
    if (s.kind === "leg") slide(d.day, "leg", `${icon(s.rowKind, "big")}${text}`);
    else if (s.data) slide(d.day, "photo", `${text}<p class="credit">${s.mine ? "Colin's pick" : `<a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(s.commons.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(s.credit)}</a>`}</p>`, s.data);
    else slide(d.day, "wanted", `<div class="frame"><p class="eyebrow">Photo wanted</p><p class="brief">${esc(s.shot)}</p><p class="file">save as <b>${esc(s.id)}</b></p></div>${s.text === s.shot ? text.replace(/<p class="tag">.*?<\/p>/, "") : text}`);
  }
  if (d.warnings.length) slide(d.day, "warn", `<div class="body">${eyebrow(d, "watch for")}${d.warnings.map((w) => `<div class="w">${w.lead ? `<h3>${esc(w.lead)}</h3>` : ""}<p>${esc(w.text)}</p></div>`).join("")}</div>`);
}
const credits = model.flatMap((d) => d.slides.filter((s) => s.data && !s.mine).map((s) => `<li><a href="https://commons.wikimedia.org/wiki/${encodeURIComponent(s.commons.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(s.title)}</a> <span>${esc(s.credit)}</span></li>`));
if (credits.length) slide(0, "credits", `<div class="body"><p class="eyebrow">Pictures</p><h3>Credits</h3><p class="tag">From Wikimedia Commons, under the licence named with each. Resized for this deck.</p><ul>${credits.join("")}</ul></div>`);

const shell = fs.readFileSync("site/src/slides.html", "utf8");
const html = shell.replaceAll("__TITLE__", esc(title)).replace("__RAIL__", () => days.map((d) => `<button type="button" data-go="${d.day}" style="--c:${col(d.day)}" aria-label="Day ${d.day}: ${esc(d.title)}">${d.day}</button>`).join("")).replace("__SLIDES__", () => S.join("\n"));
fs.mkdirSync("site/slides", { recursive: true });
fs.writeFileSync(`site/slides/${slug}.html`, html);
const n = model.reduce((a, d) => a + d.slides.filter((s) => s.kind === "photo").length, 0);
console.log(`wrote site/slides/${slug}.html (${(html.length / 1e6).toFixed(1)} MB): ${S.length} slides, ${n - want.length} of ${n} pictures in${want.length ? `; wanted: ${want.map((s) => s.id).join(", ")}` : ""}`);
if (html.length > 15.5e6) console.error("⚠ over the 16 MB page limit: split the deck or lower the picture size");
