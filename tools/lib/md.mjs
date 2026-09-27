/* md.mjs — the HTML fragments Trees stored inside its data, as Markdown.

   Trees kept prose as HTML strings in JS objects. The only tags in use were
   <b> <i> <em> <br> <code> <a>, so this is a converter for exactly those and
   nothing else: anything unrecognised is left as-is so a human sees it,
   rather than being silently dropped. */

/** Block context: <br><br> becomes a paragraph break. */
export function htmlToMd(s) {
  if (s == null) return s;
  if (typeof s !== "string") return s;
  return inline(s)
    .replace(/\s*<br\s*\/?>\s*<br\s*\/?>\s*/g, "\n\n")
    .replace(/\s*<br\s*\/?>\s*/g, "\n");
}

/** Inline context (a bullet, a table cell, a YAML scalar on one line):
    line breaks have nowhere to go, so <br> survives as literal HTML, which
    Markdown renders anyway. */
export function htmlToMdInline(s) {
  if (s == null || typeof s !== "string") return s;
  return inline(s).replace(/<br\s*\/?>/g, "<br>");
}

function inline(s) {
  return s
    .replace(/<b>([\s\S]*?)<\/b>/g, "**$1**")
    .replace(/<(i|em)>([\s\S]*?)<\/\1>/g, "*$2*")
    .replace(/<code>([\s\S]*?)<\/code>/g, "`$1`")
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, "[$2]($1)");
}
