/* garden.mjs — the gardener's mechanical checks, as pure functions.

   Each check takes plain data (file text, dates, trip records) and returns
   findings: { check, file, line, subject, says, why }. No I/O here, so the
   tests can feed it fixtures. tools/garden.mjs does the reading.

   The bar for a check living here: it can be decided by pattern and
   arithmetic with no false alarms on the current data. A check that needs
   judgment ("is this open question already answered?") belongs to the
   /gardener skill's finder agents instead. A noisy check teaches Colin to
   ignore the gardener, which is worse than no check. */

import YAML from "yaml";

const plain = (s) => String(s ?? "").replace(/\*\*|\*|`/g, "").replace(/\s+/g, " ").trim();
const clip = (s, n = 140) => (s.length > n ? s.slice(0, s.lastIndexOf(" ", n)) + "…" : s);
const lineOf = (text, index) => text.slice(0, index).split("\n").length;

// "(was: …)" notes are history, not current claims, so no check reads them.
export function stripWas(line) {
  return line.replace(/\((?:[^()]*?;\s*)?was[:\s][^()]*\)/gi, "").replace(/\bwas:?\s*"[^"]*"/gi, "");
}

/* ---------------------------------------------------------------- 1
   A gear question whose answering trip is over, still unanswered. */
export function gearQuestions(gearText, trips, today) {
  const out = [];
  const byslug = Object.fromEntries(trips.map((t) => [t.slug, t]));
  for (const m of gearText.matchAll(/```yaml\n([\s\S]*?)```/g)) {
    for (const it of YAML.parse(m[1]) ?? []) {
      const q = it?.question;
      if (!q?.answeredBy || q.answer) continue;
      const t = byslug[q.answeredBy];
      if (!t?.end || t.end >= today) continue;
      const at = gearText.indexOf(`answeredBy: ${q.answeredBy}`, gearText.indexOf(it.name));
      out.push({
        check: "gear-question-open", file: "me/gear.md", line: at < 0 ? null : lineOf(gearText, at),
        subject: plain(it.name),
        says: plain(q.text),
        why: `${q.answeredBy} ended ${t.end} and this question has no answer. /retro ${q.answeredBy} should settle it.`,
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- 2
   A line promising that a trip will settle something, after that trip is
   over. ("Re-ask after the Appalachians trip.") The class is in
   evals/questions.md's gardener seeds. */
const PROMISE = /\b(re-?ask|revisit|re-?check|will (?:answer|settle|tell|decide|show|test)|can answer|answers (?:it|this|that)|settles? (?:it|this|that)|the [\w-]+ retro (?:will|can|should)|retro (?:question|prompt)s? (?:for|about))\b/i;
export function keywordsFor(slug) {
  const first = slug.split("-")[0];
  return [slug, first].filter((k, i, a) => a.indexOf(k) === i && k.length >= 4);
}
export function promises(file, text, pastTrips) {
  const out = [];
  if (!pastTrips.length) return out;
  text.split("\n").forEach((raw, i) => {
    const line = stripWas(raw);
    const hit = line.match(PROMISE);
    if (!hit) return;
    // The trip must be named next to the promise ("re-ask after the
    // Appalachians trip"), not just somewhere on the line.
    const near = line.slice(Math.max(0, hit.index - 30), hit.index + hit[0].length + 50);
    for (const t of pastTrips) {
      const kw = keywordsFor(t.slug).find((k) => new RegExp(`\\b${k}\\b`, "i").test(near));
      if (!kw) continue;
      out.push({
        check: "promise-past-trip", file, line: i + 1, subject: t.slug,
        says: clip(plain(raw)),
        why: `Promises "${hit[0]}" about ${t.slug}, which ended ${t.end}. Either the answer is now in its log/retro and this line is stale, or it's still open and should say so.`,
      });
      break;
    }
  });
  return out;
}

/* ---------------------------------------------------------------- 3
   A decision logged after trip.md last changed: the plan may not carry it.
   CLAUDE.md: "A decision in log.md that isn't in trip.md yet is drift."
   Same-day entries are assumed applied (the skills edit both in one PR). */
const DECISION = /\b(decid\w*|chose|chosen|picked|switch\w*|cancel\w*|moved|cut|swap\w*|dropp\w*|replac\w*)\b/i;
export function logDrift(slug, entries, tripLastChanged) {
  if (!tripLastChanged) return [];
  return entries
    .filter((e) => e.date > tripLastChanged && DECISION.test(e.title))
    .map((e) => ({
      check: "log-drift", file: `trips/${slug}/log.md`, line: e.line ?? null, subject: `${e.date} · ${plain(e.title)}`,
      says: plain(e.title),
      why: `Logged ${e.date}, but trips/${slug}/trip.md last changed ${tripLastChanged}. Check the plan carries this decision.`,
    }));
}
export function logEntries(logText) {
  return [...logText.matchAll(/^## (\d{4}-\d{2}-\d{2}) · (.+)$/gm)].map((m) => ({ date: m[1], title: m[2], line: lineOf(logText, m.index) }));
}

/* ---------------------------------------------------------------- 4
   Pinned facts: values that get copied into many files (the spice ceiling
   sits in me/food.md, CLAUDE.md and the kitchen). garden/pins.yaml names the
   home file, the current value and the patterns that find copies. A copy
   that disagrees with the pin is a second version of one fact. */
const norm = (s) => String(s).replace(/[–—-]/g, "-").replace(/\s+/g, "").replace(/,/g, "").toLowerCase();
export function pinMismatches(pins, files) {
  const out = [];
  for (const pin of pins) {
    for (const [file, text] of Object.entries(files)) {
      text.split("\n").forEach((raw, i) => {
        const line = stripWas(raw);
        for (const p of pin.patterns) {
          for (const m of line.matchAll(new RegExp(p.re, "g"))) {
            if (norm(m[1]) === norm(p.expect)) continue;
            out.push({
              check: "pin-mismatch", file, line: i + 1, subject: pin.id,
              says: clip(plain(raw)),
              why: `${pin.home} says ${pin.id} is ${pin.says}; this copy says "${m[1]}".`,
            });
          }
        }
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- dismissals
   A finding Colin has looked at and called fine is never raised again.
   The fingerprint ignores line numbers, so an edit above it doesn't
   resurrect it, but a change to the line's text does. */
export function fingerprint(f) {
  return `${f.check}|${f.file}|${norm(f.subject)}|${norm(f.says).slice(0, 80)}`;
}
export function partition(findings, dismissed) {
  const gone = new Set((dismissed ?? []).map((d) => d.fingerprint));
  const shown = [], hidden = [];
  for (const f of findings) (gone.has(fingerprint(f)) ? hidden : shown).push(f);
  return { shown, hidden };
}
