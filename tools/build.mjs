#!/usr/bin/env node
/* build.mjs — the website, generated from the same files the AI reads.

     node tools/build.mjs        # writes site/index.html

   One self-contained page: every trip, log, preference and meal is parsed
   here at build time into one JSON blob, and site/src/app.js renders views
   from it in the browser. One file means it works offline once loaded, and
   there is nothing to go out of sync: the site cannot say anything the
   Markdown doesn't. Nothing here invents content; it only reshapes it. */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { marked } from "marked";
import { parseTrip, splitFrontmatter, sections } from "./lib/format.mjs";
import { parseIdea, summarize } from "./lib/wishlist.mjs";
import { parseBucket, horizonOf } from "./lib/bucket.mjs";
import { dayStops, routeLinks, campStop } from "./lib/route.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const has = (rel) => existsSync(join(ROOT, rel));
const ls = (rel) => (has(rel) ? readdirSync(join(ROOT, rel)) : []);
marked.setOptions({ gfm: true, breaks: false });
// GFM strikes text between two single tildes, and these files use "~" to mean
// "about" ("~45 min … ~1½ mugs"). Only ~~double~~ strikes through here.
marked.use({ tokenizer: { del(src) {
  const m = /^~~(?=[^\s~])([\s\S]*?[^\s~])~~(?!~)/.exec(src);
  if (m) return { type: "del", raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) };
} } });
const md = (s) => (s ? marked.parse(String(s)) : "");
const mdi = (s) => (s ? marked.parseInline(String(s)) : "");

/* --------------------------------------------------------------- trips */

/** A schedule line is often a paragraph. The field view wants the thing,
    not the reasoning: split a short title from the detail. */
export function splitRow(text) {
  let t = String(text).trim();
  let star = false, checked = false;
  for (;;) {
    if (/^⭐\s*/.test(t)) { star = true; t = t.replace(/^⭐\s*/, ""); continue; }
    if (/^✅\s*/.test(t)) { checked = true; t = t.replace(/^✅\s*/, ""); continue; }
    break;
  }
  let title, rest = "";
  const bold = /^\*\*(.+?)\*\*\s*(.*)$/s.exec(t);
  if (bold) {
    title = bold[1].replace(/[.:—\s]+$/, "");
    rest = bold[2].replace(/^[—–.:\s-]+/, "");
  } else {
    const cut = t.search(/(\. |\s—\s)/);
    if (cut > 0 && cut < 110) { title = t.slice(0, cut); rest = t.slice(cut).replace(/^[.—\s]+/, ""); }
    else if (t.length > 110) { const sp = t.lastIndexOf(" ", 100); title = t.slice(0, sp) + "…"; rest = t; }
    else title = t;
  }
  // SHOUTED titles from the old site read better in sentence case.
  if (title === title.toUpperCase() && /[A-Z]{4}/.test(title)) {
    title = title.toLowerCase().replace(/(^|\s|\(|\/)([a-z])/g, (m, a, b) => a + b.toUpperCase());
  }
  return { title: mdi(title), detail: mdi(rest), star, checked };
}

const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function parseLog(text) {
  const { body } = splitFrontmatter(text);
  const top = sections(body).children[0] ?? { children: [] };
  const entries = [], retro = [];
  for (const s of top.children) {
    const m = /^(\d{4}-\d{2}-\d{2}) · (.*)$/.exec(s.title);
    const full = [s.text, ...s.children.map((c) => `${"#".repeat(c.level)} ${c.title}\n\n${c.text}`)].join("\n\n");
    if (m) entries.push({ date: m[1], title: mdi(m[2]), html: md(full) });
    else if (/^Retro/.test(s.title)) retro.push({ title: mdi(s.title), html: md(full) });
  }
  return { entries, retro };
}

// Home, for day 1's start and a "Home" overnight: me/profile.md's "Home base".
const HOME = (() => { const m = /\*\*Home base:\*\* ([^—\n]+)/.exec(read("me/profile.md")); return m ? { label: "Home", q: m[1].trim(), pinned: false } : null; })();
const camp = (o, places) => (o?.name === "Home" ? HOME : campStop(o?.name, places));

function dayRoute(d, prev, places) {
  const r = dayStops(d.schedule ?? [], places, { start: prev ? camp(prev.overnight, places) : HOME, end: camp(d.overnight, places) });
  const all = [r.start, ...r.stops].filter(Boolean);
  return all.length >= 2 ? { pinned: all.filter((x) => x.pinned).length, total: all.length, links: routeLinks(r) } : null;
}

function buildTrip(slug) {
  const { registry: r, page } = parseTrip(read(`trips/${slug}/trip.md`));
  const places = has(`trips/${slug}/places.yaml`) ? YAML.parse(read(`trips/${slug}/places.yaml`)).groups : [];
  const sun = has(`trips/${slug}/_gen/sun.json`) ? JSON.parse(read(`trips/${slug}/_gen/sun.json`)) : null;
  const log = has(`trips/${slug}/log.md`) ? parseLog(read(`trips/${slug}/log.md`)) : { entries: [], retro: [] };
  const end = r.start && r.days ? addDays(r.start, r.days - 1) : null;
  const allPlaces = places.flatMap((g) => g.places);

  return {
    slug, title: r.title, subtitle: r.subtitle, status: r.status, start: r.start ?? null, end,
    datesLabel: r.dates, region: r.region, states: r.states ?? [], theme: r.theme, why: mdi(r.why), next: mdi(r.next),
    nights: r.nights, distance: r.distance, budget: r.budget, tags: r.tags ?? [],
    booking: (r.booking ?? []).map((b) => ({ ...b, what: mdi(b.what) })),
    located: { verified: allPlaces.filter((p) => p.verified).length, total: allPlaces.length },
    route: md(page.meta?.route),
    overview: (page.meta?.overviewCards ?? []).map((c) => ({ h: mdi(c.h), p: md(c.p) })),
    days: (page.days ?? []).map((d, i) => ({
      n: d.day, date: d.date, title: mdi(d.title), tagline: mdi(d.tagline), type: d.type,
      driving: mdi(d.driving), slack: mdi(d.slack), noSignal: mdi(d.noSignal),
      overnight: d.overnight?.name ? {
        name: mdi(d.overnight.name), place: mdi(d.overnight.place), kind: mdi(d.overnight.kind),
        cost: mdi(d.overnight.cost), checkin: mdi(d.overnight.checkin),
        confirmation: mdi(d.overnight.confirmation), notes: mdi(d.overnight.notes),
      } : null,
      schedule: (d.schedule ?? []).map((s) => ({ time: s.time, est: s.est ?? "", kind: s.kind, warn: !!s.warn, maps: s.maps ?? null, ...splitRow(s.text) })),
      meals: Object.fromEntries(Object.entries(d.meals ?? {}).map(([k, v]) => [k, mdi(v)])),
      highlights: md(d.highlights), warnings: md(d.warnings),
      route: dayRoute(d, page.days[i - 1], allPlaces),
      sun: sun?.rows?.[i] ?? null,
    })),
    hikes: (page.hikes?.rows ?? []).map((h) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, typeof v === "string" ? mdi(v) : v]))),
    places: places.map((g) => ({ group: g.group, places: g.places.map((p) => ({ ...p, note: mdi(p.note), source: mdi(p.source) })) })),
    reservations: (page.reservations ?? []).map((x) => ({ done: !!x.booked, text: mdi(x.text) })),
    questions: (page.openQuestions ?? []).map((q) => ({ q: mdi(q.question), blocks: mdi(q.blocks), detail: md(q.detail) })),
    packing: (page.packing ?? []).map((c) => ({ category: mdi(c.category), items: c.items.map(mdi) })),
    provisions: page.provisions ? {
      summary: md(page.provisions.summary),
      critical: md(page.provisions.criticalSlots),
      stops: (page.provisions.lists ?? []).map((l) => ({ group: mdi(l.group), note: mdi(l.note), items: l.items.map(mdi) })),
    } : null,
    weather: (page.weather ?? []).map((w) => ({ ...w, notes: mdi(w.notes) })), weatherNote: md(page.weatherNote),
    notes: (page.notes ?? []).map((n) => ({ h: mdi(n.heading), body: md(n.body) })),
    sunNote: md(sun?.note),
    log,
  };
}

/* ------------------------------------------------------------------ me */

function yamlBlocksToLists(text) {
  // Gear-style ```yaml lists become real lists; everything else stays prose.
  return text.replace(/```yaml\n([\s\S]*?)```/g, (_, y) => {
    let data; try { data = YAML.parse(y); } catch { return ""; }
    if (Array.isArray(data) && data.every((x) => x && typeof x === "object" && x.name)) {
      return data.map((it) => `<div class="gear-row"><span class="pill pill-${String(it.state ?? "").toLowerCase()}">${it.state ?? ""}</span><div><div class="gear-name">${mdi(it.name)}${it.qty != null ? ` <span class="muted">×${it.qty}</span>` : ""}</div>${it.note ? `<div class="gear-note">${mdi(it.note)}</div>` : ""}${it.question ? `<div class="gear-q"><b>Open question:</b> ${mdi(it.question.text)}${it.question.answer ? `<br><b>Answer:</b> ${mdi(it.question.answer)}` : ` <span class="muted">(answered by ${it.question.answeredBy})</span>`}</div>` : ""}</div></div>`).join("\n");
    }
    return "\n```yaml\n" + y + "```\n";
  });
}

function buildMe() {
  const order = ["profile", "food", "hiking", "principles", "gear", "declined", "calendar", "booking", "checklist", "working-rules"];
  return ls("me").filter((f) => f.endsWith(".md")).map((f) => {
    const { data, body } = splitFrontmatter(read(`me/${f}`));
    const clean = body.replace(/^# .*\n/, "");
    return {
      id: f.replace(/\.md$/, ""), topic: data.topic, summary: data.summary ?? "",
      html: md(yamlBlocksToLists(clean)),
      lists: { avoid: data.avoid, dislikes: data.dislikes, declined: data.declined },
    };
  }).sort((a, b) => (order.indexOf(a.id) + 99) % 99 - (order.indexOf(b.id) + 99) % 99);
}

function gearNeeds() {
  if (!has("me/gear.md")) return [];
  const out = [];
  for (const m of read("me/gear.md").matchAll(/```yaml\n([\s\S]*?)```/g)) {
    for (const it of YAML.parse(m[1]) ?? []) {
      if (["need", "unknown", "replace"].includes(it.state)) out.push({ name: mdi(it.name), state: it.state });
    }
  }
  return out;
}

/* ------------------------------------------------------------- kitchen */

function buildKitchen() {
  if (!has("kitchen/staples.md")) return null;
  const text = read("kitchen/staples.md");
  const { data: fm } = splitFrontmatter(text);
  const block = (tag) => YAML.parse(new RegExp("```yaml " + tag + "\\n([\\s\\S]*?)```").exec(text)[1]);
  const foods = Object.fromEntries(block("foods").map((f) => [f.id, f]));
  const K = ["kcal", "protein_g", "carbs_g", "fat_g"];
  // Method text lives in the prose: "- **B1 · Power oats.** Boil some water…"
  const method = {};
  for (const m of text.matchAll(/^- \*\*([A-Z]\d) · ([^*]+?)\.?\*\*\s*([\s\S]*?)(?=\n- \*\*[A-Z]\d ·|\n\n\*\*|\n## )/gm)) method[m[1]] = mdi(m[3].trim());
  const meals = block("meals").filter((m) => !m.id.startsWith("OLD")).map((m) => {
    const t = Object.fromEntries(K.map((k) => [k, 0]));
    let est = false;
    const items = Object.entries(m.items).map(([id, q]) => {
      const f = foods[id]; for (const k of K) t[k] += f[k] * q;
      if (f.basis !== "label") est = true;
      return { name: f.name, qty: q, serving: f.serving };
    });
    for (const k of K) t[k] = Math.round(t[k]);
    const slot = { B: "Breakfast", L: "Lunch", D: "Dinner", S: "Snacks" }[m.id[0]] ?? "Other";
    return { id: m.id, name: m.name, slot, t, est, items, method: method[m.id] ?? "" };
  });
  const intro = /# Staples\n\n([\s\S]*?)\n## /.exec(text)?.[1] ?? "";
  const shopping = /## Shopping list[^\n]*\n\n([\s\S]*)$/.exec(text)?.[1] ?? "";
  return { targets: fm.targets, meals, intro: md(intro), shopping: md(shopping) };
}

/* ------------------------------------------------------------ wishlist */

function buildIdea(f) {
  const { fm, why, next, notes, entries } = parseIdea(read(`wishlist/${f}`));
  return {
    slug: fm.slug ?? f.replace(/\.md$/, ""), title: fm.title, subtitle: fm.subtitle ?? "",
    region: fm.region ?? "", mode: fm.mode ?? "", months: fm.months ?? [],
    length: fm.days ? `${fm.days} days` : fm.nights ?? "", window: mdi(fm.window), budget: mdi(fm.budget),
    tags: fm.tags ?? [], target: fm.target ?? null, updated: fm.updated ?? "", ...horizonOf(fm),
    teaser: mdi(summarize(why, 160)), why: md(why), next: md(next), notes: md(notes), noteCount: entries.length,
  };
}

/* -------------------------------------------------------------- bucket */

function buildBucket() {
  if (!has("bucket.yaml")) return [];
  return parseBucket(read("bucket.yaml")).items.map((it) => ({
    id: it.id, name: it.name, kind: it.kind, where: it.where, state: it.state, status: it.status,
    months: it.months ?? [], why: mdi(it.why), verdict: mdi(it.verdict), reason: mdi(it.reason),
    trip: it.trip ?? null, wishlist: it.wishlist ?? null, when: it.when ?? null,
  }));
}

/* --------------------------------------------------------------- write */

const trips = ls("trips").filter((s) => has(`trips/${s}/trip.md`)).map(buildTrip)
  .sort((a, b) => (a.start ?? "9") < (b.start ?? "9") ? -1 : 1);
const ideas = ls("wishlist").filter((f) => f.endsWith(".md")).sort().map(buildIdea);
const bucket = buildBucket();
const data = { builtAt: new Date().toISOString(), trips, ideas, bucket, me: buildMe(), gearNeeds: gearNeeds(), kitchen: buildKitchen() };

const tpl = read("site/src/template.html")
  .replace("/*__CSS__*/", () => read("site/src/app.css"))
  .replace("/*__JS__*/", () => read("site/src/app.js"))
  .replace("/*__DATA__*/", () => JSON.stringify(data).replace(/</g, "\\u003c"));
mkdirSync(join(ROOT, "site"), { recursive: true });
writeFileSync(join(ROOT, "site/index.html"), tpl);
console.log(`wrote site/index.html (${Math.round(tpl.length / 1024)} KB): ${trips.length} trips, ${ideas.length} ideas, ${bucket.length} bucket items, ${data.me.length} me files, ${data.kitchen?.meals.length ?? 0} meals`);
