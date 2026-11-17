/* slides.mjs — a trip's slideshow, as data.

   trips/<slug>/slides.yaml lists the pictures (the "shots"): which day, which
   stop, what the picture should show, and where a default comes from. Every
   word on a slide comes from trip.md when the deck is built, so the deck can't
   drift from the plan; a shot whose stop has left the plan is reported.

   A shot:
     id:      d07-skellig-steps   the name Colin saves his own picture under (any image type)
     day:     7
     stop:    Skellig Michael landing   text found in one of that day's schedule rows
     shot:    what the picture should show (the brief, and the caption on a second picture of one stop)
     commons: "File:….jpg"        optional: Claude's default, from Wikimedia Commons
     credit:  "Author · CC BY-SA 4.0"   required with commons: shown on the slide and the credits page
     title:   optional heading, when the row has no bold name or the shot needs its own */
import YAML from "yaml";

export const parseSlides = (text) => { const y = YAML.parse(text) ?? {}; return { ...y, shots: y.shots ?? [] }; };

// Plan text for a slide: no provenance notes, no Markdown marks.
export const plain = (s) => String(s ?? "")
  .replace(/\s*\*\((?:[^()]|\([^()]*\))*\)\*/g, "")   // *(source, date)*
  .replace(/\s*\((?:[^()]*\b20\d\d-\d\d-\d\d[^()]*|Open questions)\)/g, "")   // (Colin, 2026-11-11; booking row)
  .replace(/\*\*|`/g, "").replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2")
  .replace(/\s+([.,;:])/g, "$1").replace(/\s{2,}/g, " ").trim();

// The first sentences of a text that fit in `max` characters.
export function lede(text, max = 230) {
  const t = plain(text); if (t.length <= max) return t;
  const parts = t.split(/(?<=[.!?])\s+(?=[A-Z€£$"“(⚠\d])/); let out = "";
  for (const p of parts) { if ((out + " " + p).trim().length > max) break; out = (out + " " + p).trim(); }
  return (out || t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…").trim();
}

const rowName = (text) => { const m = /\*\*(.+?)\*\*/.exec(text ?? ""); return m ? plain(m[1]).replace(/[:.]$/, "") : null; };
const rowBody = (text) => plain(String(text ?? "").replace(/^\s*\*\*(.+?)\*\*\s*[:.,]?\s*/, "")).replace(/^[a-z]/, (c) => c.toUpperCase());
const SOFT = /^(option|optional|fallback)/i;

/** What's wrong with a slides file, against its trip's days (parseTrip(...).page.days). */
export function checkSlides({ shots }, days) {
  const out = [], seen = new Set(), byDay = new Map(days.map((d) => [d.day, d]));
  for (const s of shots) {
    const at = s.id ?? "(no id)";
    if (!/^d\d{2}-[a-z0-9-]+$/.test(s.id ?? "")) out.push(`${at}: id must look like d07-skellig-steps`);
    if (seen.has(s.id)) out.push(`${at}: used twice`); seen.add(s.id);
    if (!s.shot) out.push(`${at}: needs a shot (what the picture should show)`);
    if (s.commons && !/^File:.+\.(jpe?g|png|webp|tiff?)$/i.test(s.commons)) out.push(`${at}: commons must be a "File:….jpg" title`);
    if (s.commons && !s.credit) out.push(`${at}: a Commons picture needs its credit (author · licence)`);
    const d = byDay.get(s.day);
    if (!d) { out.push(`${at}: day ${s.day} isn't in the trip`); continue; }
    if (+s.id?.slice(1, 3) !== s.day) out.push(`${at}: the id says day ${+s.id?.slice(1, 3)}, the shot says day ${s.day}`);
    if (s.stop && !d.schedule?.some((r) => plain(r.text).toLowerCase().includes(s.stop.toLowerCase()))) out.push(`${at}: no row on day ${s.day} mentions "${s.stop}" any more`);
    if (!s.stop && !s.title) out.push(`${at}: needs a stop or a title`);
  }
  return out;
}

// A row that moves you (a flight, a coach, a ferry, a named drive) gets its own slide when it has no picture.
const TRANSIT = new Set(["fly", "travel", "ferry", "boat"]);
const short = (text, max = 64) => { const n = rowName(text); if (n) return n; const t = lede(text, max); return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t; };

/** The deck: per day a cover, the day's plan as a list, then in the order of the day a slide per
    picture and per unpictured leg of travel, and a warning slide when the day has one. */
export function deck({ shots }, days) {
  return days.map((d) => {
    const mine = shots.filter((x) => x.day === d.day), rows = d.schedule ?? [], slides = [], placed = new Set();
    const rowOf = (s) => (s.stop ? rows.find((r) => plain(r.text).toLowerCase().includes(s.stop.toLowerCase())) : null);
    const photo = (s, row, first) => ({ kind: "photo", id: s.id, shot: s.shot, commons: s.commons ?? null, credit: s.credit ?? null,
      title: s.title ?? (row && rowName(row.text)) ?? s.stop, rowKind: row?.kind ?? null,
      when: row ? [row.time, row.kind].filter(Boolean).join(" · ") : "",
      soft: !!row && SOFT.test(row.time ?? ""), warn: !!row?.warn,
      text: first && !s.title ? lede(rowBody(row.text)) : plain(s.shot) });
    for (const row of rows) {
      const here = mine.filter((s) => rowOf(s) === row);
      here.forEach((s, i) => { slides.push(photo(s, row, i === 0)); placed.add(s); });
      const soft = SOFT.test(row.time ?? "");
      if (!here.length && !soft && (TRANSIT.has(row.kind) || (row.kind === "drive" && rowName(row.text))))
        slides.push({ kind: "leg", rowKind: row.kind, title: short(row.text), when: [row.time, row.kind].filter(Boolean).join(" · "), warn: !!row.warn, text: rowName(row.text) ? lede(rowBody(row.text)) : "" });
    }
    for (const s of mine) if (!placed.has(s)) slides.push(photo(s, null, false));
    const plan = rows.map((r) => ({ time: r.time ?? "", kind: r.kind, name: short(r.text), soft: SOFT.test(r.time ?? ""), warn: !!r.warn }));
    const warnings = String(d.warnings ?? "").split(/\n{2,}/).map((w) => w.trim()).filter(Boolean)
      .map((w) => ({ lead: rowName(w), text: lede(rowBody(w), 420) }));
    return { day: d.day, date: d.date, title: d.title, tagline: plain(d.tagline), type: d.type,
      driving: plain(d.driving), slack: plain(d.slack),
      bed: d.overnight ? [plain(d.overnight.name), plain(d.overnight.place)].filter(Boolean).join(" · ") : "",
      bedName: d.overnight ? plain(d.overnight.name).replace(/\s*\((picked|booked)[^)]*\)/i, "") : "", bedPlace: d.overnight ? plain(d.overnight.place) : "",
      meals: d.meals ? ["b", "l", "d"].filter((k) => d.meals[k]).map((k) => `${k.toUpperCase()} ${plain(d.meals[k])}`) : [],
      plan, slides, warnings };
  });
}

/** Where you sleep: consecutive nights in one bed, as one line. */
export function beds(model) {
  const out = [];
  for (const d of model) { if (!d.bedName) continue; const last = out[out.length - 1];
    if (last && last.name === d.bedName && last.to === d.day - 1) last.to = d.day; else out.push({ name: d.bedName, place: d.bedPlace, from: d.day, to: d.day }); }
  return out;
}
