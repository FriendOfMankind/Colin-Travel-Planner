/* bucket.mjs — the bucket list: single places worth seeing that don't make a
   trip on their own. One hike, one lake, one campground, one city walk.

   Three sizes, each pointing down instead of copying:
     trips/<slug>/     dated trips          (a trip lists the places on it)
     wishlist/<slug>   potential trips      (an idea bundles places + a season)
     bucket.yaml       single places        (this file's data)

   An item that belongs to an idea or a trip carries a pointer (`wishlist:` or
   `trip:`) and a one-line `why`. The facts stay in the idea or the trip, so
   there is never a second copy of one fact. */

import YAML from "yaml";

export const KINDS = [
  "hike", "walk", "view", "waterfall", "lake", "swim", "river", "campground",
  "city", "ruin", "cave", "geology", "wildlife", "fossil", "food", "drive", "other",
];
export const STATUSES = ["want", "done", "dropped"];
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// US state or Canadian province code. `where` carries the human version.
const STATE = /^[A-Z]{2}$/;
const NO_COORDS = ["lat", "lng", "lon", "coords", "coordinates"];

export function parseBucket(text) {
  const data = YAML.parse(text) ?? {};
  return { note: data.note ?? "", items: data.items ?? [] };
}

/** Every problem with the list, as strings. Empty means valid.
    `known` = { trips: Set, ideas: Set } of slugs that pointers may name. */
export function checkBucket(items, known = { trips: new Set(), ideas: new Set() }) {
  const errs = [];
  const seen = new Set();
  for (const [i, it] of items.entries()) {
    const at = `item ${i + 1} (${it?.id ?? it?.name ?? "?"})`;
    if (!it || typeof it !== "object") { errs.push(`${at}: not a mapping`); continue; }
    if (!ID.test(it.id ?? "")) errs.push(`${at}: id must be kebab-case`);
    else if (seen.has(it.id)) errs.push(`${at}: duplicate id`);
    seen.add(it.id);
    for (const k of ["name", "where", "why", "source", "added"]) if (!it[k]) errs.push(`${at}: ${k} is required`);
    if (!KINDS.includes(it.kind)) errs.push(`${at}: kind must be one of ${KINDS.join(", ")}`);
    if (!STATUSES.includes(it.status)) errs.push(`${at}: status must be want | done | dropped`);
    if (!STATE.test(it.state ?? "")) errs.push(`${at}: state must be a two-letter state/province code`);
    for (const k of NO_COORDS) if (k in it) errs.push(`${at}: no coordinates in the bucket list (never invent one; places live in a trip's places.yaml)`);
    if (it.months != null && !(Array.isArray(it.months) && it.months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12))) errs.push(`${at}: months must be a list of 1–12`);
    if (it.trip && !known.trips.has(it.trip)) errs.push(`${at}: trip "${it.trip}" doesn't exist in trips/`);
    if (it.wishlist && !known.ideas.has(it.wishlist)) errs.push(`${at}: wishlist "${it.wishlist}" doesn't exist in wishlist/`);
    if (it.status === "done" && !it.trip && !it.when) errs.push(`${at}: done needs a trip: (preferred) or a when:`);
    if (it.status === "dropped" && !it.reason) errs.push(`${at}: dropped needs a one-line reason, so it isn't re-researched`);
  }
  return errs;
}

/** The horizon test from me/calendar.md, as a sort key for potential trips.
    only-now: can't survive a two-week PTO allowance after 2027-08-31.
    keeps:    fits in PTO later.  weekend: inside the weekend radius.
    confirmed: happening, but no trips/ page yet (/new-trip isn't built).
    An explicit `horizon:` in the frontmatter wins; otherwise it's derived. */
export const HORIZONS = ["only-now", "confirmed", "keeps", "weekend"];
export function horizonOf(fm) {
  if (fm.horizon) return { horizon: fm.horizon, derived: false };
  if (fm.mode === "weekend") return { horizon: "weekend", derived: true };
  if (Number(fm.days) >= 15) return { horizon: "only-now", derived: true };
  return { horizon: "keeps", derived: true };
}
