/* route.mjs — a day's stops as Google Maps directions links.

   A day runs from the camp you woke up at (home on day 1) through the
   day's 📍 queries in schedule order to tonight's camp. Camps are found by
   matching the overnight name to a place in places.yaml. A camp with no
   fixed place (a dispersed site) has no start, so Google starts from
   wherever the phone is. Consecutive repeats are dropped. A stop that
   matches a verified place routes to its coordinate instead of a search,
   so a located place can't resolve to the wrong trailhead.

   Google documents up to 3 waypoints on mobile browsers and 9 otherwise
   (developers.google.com/maps/documentation/urls/get-started, 2026-10), so
   a long day splits into links of at most 3 waypoints + 1 destination,
   each starting where the last one ended. */

export const MAX_WAYPOINTS = 3;

const pinOf = (p) => (p.verified ? `${p.lat},${p.lng}` : p.maps);

// A camp as a stop: "Stone Cliff Campground — first-come" matches the place
// named "Stone Cliff Campground". null when nothing matches.
export function campStop(name, places = []) {
  const key = String(name ?? "").replace(/\s+—.*$/, "").trim().toLowerCase();
  const p = key && places.find((x) => x.maps && x.name.toLowerCase() === key);
  return p ? { label: p.name, q: pinOf(p), pinned: !!p.verified } : null;
}

// Same stop twice in a row: identical query, or two spellings of one town
// ("Avon, OH" in a schedule, "Avon, Ohio" as home). Coordinates compare whole.
const COORD = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/;
const town = (q) => q.toLowerCase().split(",")[0].trim();
const samePlace = (a, b) => !!a && (a.q === b.q || (!COORD.test(a.q) && !COORD.test(b.q) && a.q.includes(",") && b.q.includes(",") && town(a.q) === town(b.q)));

export function dayStops(schedule, places = [], { start = null, end = null } = {}) {
  const pins = new Map(places.filter((p) => p.verified && p.maps).map((p) => [p.maps, pinOf(p)]));
  const stops = start ? [start] : [];
  const add = (s) => { if (s && !samePlace(stops.at(-1), s)) stops.push(s); };
  for (const r of schedule) if (r.maps) add({ label: r.maps, q: pins.get(r.maps) ?? r.maps, pinned: pins.has(r.maps) });
  add(end);
  return { start: start ? stops.shift() : null, stops };
}

const enc = encodeURIComponent;

export function routeLinks({ start, stops }) {
  const links = [];
  let origin = start;
  for (let i = 0; i < stops.length; ) {
    const leg = stops.slice(i, i + MAX_WAYPOINTS + 1);
    const dest = leg.at(-1), via = leg.slice(0, -1);
    const url = "https://www.google.com/maps/dir/?api=1&travelmode=driving"
      + (origin ? `&origin=${enc(origin.q)}` : "")
      + `&destination=${enc(dest.q)}`
      + (via.length ? `&waypoints=${enc(via.map((s) => s.q).join("|"))}` : "");
    links.push({ url, from: origin?.label ?? null, stops: leg.map((s) => s.label) });
    origin = dest;
    i += leg.length;
  }
  return links;
}
