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
