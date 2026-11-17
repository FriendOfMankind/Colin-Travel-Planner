/* posters.mjs — what tools/poster.mjs leaves behind for the site, and how the
   site knows a poster has gone stale.

   tools/poster.mjs writes the big files to site/posters/ (generated, not kept)
   and three small ones to share/posters/ (kept in git, so Pages and the
   claude.ai page can show them): <slug>.jpg (web size), <slug>-thumb.jpg and
   <slug>.json ({ made, route, days }). `route` is a fingerprint of the day
   lines the poster drew; when the plan's lines change, the build's fingerprint
   differs and the site says the poster is behind. */
import { createHash } from "node:crypto";

export const POSTER_DIR = "share/posters";

/** A fingerprint of a trip's day lines (the features of site/maps/<slug>-trip.geojson). */
export function routePrint(features) {
  const lines = features.filter((f) => f.geometry?.type === "LineString")
    .map((f) => [f.properties.day, f.geometry.coordinates.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)])])
    .sort((a, b) => a[0] - b[0]);
  return createHash("sha1").update(JSON.stringify(lines)).digest("hex").slice(0, 12);
}

// One colour per day, first to last: gold at the start, through orange and crimson, to blue at the
// end. The poster's line, its day list and its elevation strip use it, and so does the slideshow.
const RAMP = [[242, 178, 31], [232, 102, 42], [199, 48, 90], [123, 58, 154], [43, 79, 158]];
export function dayColor(day, first, last) {
  const t = last > first ? (Math.max(first, Math.min(last, day)) - first) / (last - first) * (RAMP.length - 1) : 0, i = Math.min(RAMP.length - 2, Math.floor(t)), u = t - i;
  return "#" + RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * u).toString(16).padStart(2, "0")).join("");
}
