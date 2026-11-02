/* sections.mjs — a Markdown file as a list of headed sections, so a reader
   can pull one day or one heading instead of a 100 KB file.

   A section runs from its heading to the next heading at the same level or
   higher. Headings inside fenced code blocks and the YAML frontmatter don't
   count. Line numbers are 1-based and inclusive. */

export function sections(text) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1);
    if (close > 0) { out.push({ level: 0, title: "frontmatter", start: 1, end: close + 1 }); i = close + 1; }
  }
  let fence = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    const f = /^(```|~~~)/.exec(l);
    if (f) { fence = fence === null ? f[1] : fence === f[1] ? null : fence; continue; }
    if (fence !== null) continue;
    const m = /^(#{1,6}) +(.+?) *#*$/.exec(l);
    if (m) out.push({ level: m[1].length, title: m[2], start: i + 1, end: null });
  }
  for (let k = 0; k < out.length; k++) {
    if (out[k].end) continue;
    const next = out.slice(k + 1).find((s) => s.level > 0 && s.level <= out[k].level);
    let end = next ? next.start - 1 : lines.length;
    while (end > out[k].start && lines[end - 1].trim() === "") end--; // drop trailing blank lines
    out[k].end = end;
  }
  return out;
}

// The text of one section, by its line range.
export const slice = (text, s) => text.split("\n").slice(s.start - 1, s.end).join("\n");

/* Find sections by a query: "day 5", a date (2027-07-20), or any heading text
   (case-insensitive, matched as a substring). Day and date queries match only
   "Day N — date · title" headings, so "day 1" never matches Day 10. */
export function find(list, query) {
  const q = query.trim();
  const day = /^day\s*(\d+)$/i.exec(q);
  if (day) return list.filter((s) => new RegExp(`^Day ${day[1]}\\b(?!\\d)`).test(s.title));
  if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return list.filter((s) => /^Day \d+/.test(s.title) && s.title.includes(q));
  if (/^front(matter)?$/i.test(q)) return list.filter((s) => s.level === 0);
  const lower = q.toLowerCase();
  return list.filter((s) => s.level > 0 && s.title.toLowerCase().includes(lower));
}
