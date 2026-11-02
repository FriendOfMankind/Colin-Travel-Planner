/* timeline.mjs — the overall plan, from today to the horizon, computed.

   Every day between today and me/calendar.md's horizon gets one kind:
     trip    a dated trip (trips/<slug>, start or target + days)
     block   a blocked date from the calendar (family, commencement)
     class   a class day (term, weekday in classDays, not a noClass day)
     free    none of those
   A run of free days at least MIN_GAP long is a gap: room for something.
   Pencilled ideas (a wishlist file with `start:`) are drawn on top; they
   don't close a gap, they sit in it. Nothing here is typed by hand, so
   when a trip moves or a term changes, the gaps move with it. */

export const MIN_GAP = 5;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const t = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const addDays = (iso, n) => new Date(t(iso) + n * 864e5).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((t(b) - t(a)) / 864e5);
const dow = (iso) => new Date(t(iso)).getUTCDay();
function* range(a, b) { for (let d = a; d <= b; d = addDays(d, 1)) yield d; }
const span = (x) => (x.date ? { start: String(x.date), end: String(x.date) } : { start: String(x.start), end: String(x.end ?? x.start) });
const overlaps = (a, b) => a.start <= b.end && b.start <= a.end;

/** The calendar's ```yaml block from me/calendar.md, already parsed. */
export function calendarFrom(md, YAML) {
  const m = /```yaml\n([\s\S]*?)```/.exec(md);
  return m ? YAML.parse(m[1]) : { terms: [], blocked: [] };
}

/** What fits a gap of n days, from the calendar's modeFit (longest first). */
export function fitFor(n, modeFit = []) {
  const f = [...modeFit].sort((a, b) => b.minDays - a.minDays).find((x) => n >= x.minDays);
  return f ? { mode: f.mode, label: f.label } : null;
}

/**
 * @param today     YYYY-MM-DD
 * @param cal       the parsed calendar block
 * @param trips     [{ slug, title, start, end, ... }] (dated, live)
 * @param ideas     [{ slug, title, months, days, mode, horizon, updated, start? , end? }]
 * @returns { from, to, horizon, days: {iso: kind}, items: [...] }  items in date order
 */
export function buildTimeline({ today, cal, trips = [], ideas = [] }) {
  const to = cal.horizon?.date ? addDays(String(cal.horizon.date), -1) : addDays(today, 365);
  const kind = {};
  const noClass = new Set();
  for (const term of cal.terms ?? []) for (const n of term.noClass ?? []) { const s = span(n); for (const d of range(s.start, s.end)) noClass.add(d); }
  for (const d of range(today, to)) {
    kind[d] = "free";
    for (const term of cal.terms ?? []) {
      if (d >= String(term.start) && d <= String(term.end) && (term.classDays ?? []).includes(dow(d)) && !noClass.has(d)) kind[d] = "class";
    }
  }
  for (const b of cal.blocked ?? []) { const s = span(b); for (const d of range(s.start, s.end)) if (kind[d]) kind[d] = "block"; }
  const live = trips.filter((x) => x.start && x.end >= today && x.start <= to);
  for (const x of live) for (const d of range(x.start, x.end)) if (kind[d]) kind[d] = "trip:" + x.slug;

  // Gaps: runs of free days. A run that touches today still counts from today.
  const gaps = [];
  let run = [];
  const flush = () => { if (run.length >= MIN_GAP) gaps.push({ start: run[0], end: run.at(-1), days: run.length }); run = []; };
  for (const d of range(today, to)) { if (kind[d] === "free") run.push(d); else flush(); }
  flush();

  // Pencilled ideas: drawn over the grid, attached to the gap they sit in.
  const pencilled = ideas.filter((i) => i.start && i.end >= today && i.start <= to);
  const idea = {};
  for (const i of pencilled) for (const d of range(i.start, i.end)) if (kind[d] && !kind[d].startsWith("trip:")) idea[d] = i.slug;

  const named = [];
  for (const term of cal.terms ?? []) for (const n of term.noClass ?? []) named.push({ ...span(n), name: n.name });
  const items = [];
  for (const g of gaps) {
    const months = [...new Set([...range(g.start, g.end)].map((d) => +d.slice(5, 7)))];
    const inside = pencilled.filter((i) => overlaps(i, g));
    const fits = ideas
      .filter((i) => !i.start && i.months?.some((m) => months.includes(m)) && (i.days == null || Number(i.days) <= g.days))
      .sort((a, b) => (a.horizon === "only-now") !== (b.horizon === "only-now") ? (a.horizon === "only-now" ? -1 : 1) : String(b.updated ?? "").localeCompare(String(a.updated ?? "")));
    items.push({
      type: "gap", ...g, label: named.find((n) => overlaps(n, g))?.name ?? null,
      fit: fitFor(g.days, cal.modeFit), pencilled: inside.map((i) => i.slug), ideas: fits.map((i) => i.slug),
    });
  }
  for (const x of live) items.push({ type: "trip", slug: x.slug, start: x.start, end: x.end });
  for (const i of pencilled) if (!gaps.some((g) => overlaps(i, g))) items.push({ type: "idea", slug: i.slug, start: i.start, end: i.end });
  for (const b of cal.blocked ?? []) {
    const s = span(b);
    if (s.end < today || s.start > to || pencilled.some((i) => overlaps(i, s))) continue;
    items.push({ type: "mark", ...s, title: String(b.name).replace(/\s*\(.*\)\s*$/, "").replace(/\s+—\s+/, " · ") });
  }
  for (const term of cal.terms ?? []) {
    const s = { start: String(term.start), end: String(term.end) };
    if (s.end < today || s.start > to) continue;
    const days = (term.classDays ?? []).map((n) => DOW[n]);
    if (/finals/i.test(term.name)) items.push({ type: "mark", ...s, title: "Finals" });
    else if (s.start > today) items.push({ type: "term", ...s, title: `${term.name} starts`, detail: `${days.join("/")} classes until ${s.end}` });
  }
  if (cal.horizon?.date) items.push({ type: "mark", start: String(cal.horizon.date), end: String(cal.horizon.date), title: cal.horizon.name, horizon: true });
  const order = { term: 0, mark: 1, gap: 2, idea: 3, trip: 4 };
  items.sort((a, b) => a.start.localeCompare(b.start) || order[a.type] - order[b.type]);

  const current = (cal.terms ?? []).find((x) => today >= String(x.start) && today <= String(x.end));
  return {
    from: today, to, horizon: cal.horizon ?? null, days: kind, idea,
    current: current ? { name: current.name, end: String(current.end), classDays: (current.classDays ?? []).map((n) => DOW[n]) } : null,
    items,
  };
}
