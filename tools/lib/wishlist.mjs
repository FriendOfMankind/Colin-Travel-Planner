/* wishlist.mjs — the idea file format, both directions.

   An idea is one file, wishlist/<slug>.md, because it has no days, no
   places and no log yet. It's a destination worth daydreaming about, plus
   everything learned while daydreaming. When an idea becomes a real trip it
   moves to trips/<slug>/ (see /new-trip) and this file goes with it as the
   start of that trip's log.

     ---
     slug, title, subtitle, status: wishlist
     months, mode, days, nights, window  ← what the calendar matches against
     region, country, coords (display only, a region centroid, never a pin)
     tags, budget, target, updated, source
     ---
     # Title
     *subtitle*
     ## Why            the pitch, and what's known about it
     ## Next           the one thing that would move it forward
     ## Research notes dated entries, newest last. /daydream writes here. */

import { splitFrontmatter, sections, toYaml } from "./format.mjs";

const FIELDS = ["slug", "title", "subtitle", "status", "months", "mode", "days", "nights", "window", "dates", "start",
  "target", "region", "country", "coords", "distance", "budget", "tags", "booking", "updated", "source"];

export const NOTES_INTRO = "Dated entries, newest last. What was found while daydreaming, with a source on every fact. `/daydream` writes here.";

/** { fm, why, next, notes } → wishlist/<slug>.md text. */
export function emitIdea({ fm, why, next, notes }) {
  const data = Object.fromEntries(FIELDS.filter((k) => fm[k] != null && fm[k] !== "").map((k) => [k, fm[k]]));
  return [
    "---", toYaml(data), "---", "",
    `# ${fm.title}`, "",
    ...(fm.subtitle ? [`*${fm.subtitle}*`, ""] : []),
    "## Why", "", why?.trim() || "Not recorded.", "",
    "## Next", "", next?.trim() || "Not recorded.", "",
    "## Research notes", "", NOTES_INTRO, "", ...(notes?.trim() ? [notes.trim(), ""] : []),
  ].join("\n");
}

/** wishlist/<slug>.md → { fm, why, next, notes, entries }. */
export function parseIdea(md) {
  const { data: fm, body } = splitFrontmatter(md);
  const top = sections(body).children[0] ?? { children: [] };
  const sec = (t) => top.children.find((c) => c.title === t);
  const notesSec = sec("Research notes");
  // The dated entries are ### children of this section, so take its raw text
  // up to the next ## (or the end) rather than the section's own paragraph.
  const raw = /^## Research notes[^\n]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body)?.[1] ?? "";
  const notes = raw.replace(NOTES_INTRO, "").trim();
  return {
    fm, why: sec("Why")?.text ?? "", next: sec("Next")?.text ?? "",
    notes, entries: notesSec?.children.filter((c) => /^\d{4}-\d{2}-\d{2}/.test(c.title)) ?? [],
  };
}

/** A one-line summary for INDEX.md and the site: the first paragraph of
    `why`, cut at a word boundary. Derived, so it can't drift. */
export function summarize(text, max = 220) {
  const first = String(text ?? "").split(/\n\n|<br><br>/)[0].replace(/\s+/g, " ").trim();
  if (first.length <= max) return first;
  const cut = first.lastIndexOf(" ", max);
  let s = first.slice(0, cut > 0 ? cut : max);
  // don't leave an unclosed ** or * dangling
  if ((s.match(/\*\*/g) ?? []).length % 2) s = s.replace(/\*\*(?!.*\*\*)/, "");
  return s + "…";
}
