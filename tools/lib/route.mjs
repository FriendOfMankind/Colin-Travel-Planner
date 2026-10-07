/* route.mjs — a day's stops as Google Maps directions links.

   The stops are the day's 📍 queries in schedule order, with consecutive
   repeats dropped. A query that matches a verified place in places.yaml
   (by its `maps` string) routes to that place's coordinate instead of a
   search, so a located place can't resolve to the wrong trailhead.

   The first link has no origin, so Google starts it from wherever the phone
   is: in the field that's camp. Google documents up to 3 waypoints on
   mobile browsers and 9 otherwise (developers.google.com/maps/documentation/
   urls/get-started, 2026-10), so a long day splits into links of at most
   3 waypoints + 1 destination, each starting where the last one ended. */

export const MAX_WAYPOINTS = 3;

export function dayStops(schedule, places = []) {
  const pins = new Map(places.filter((p) => p.verified && p.maps).map((p) => [p.maps, `${p.lat},${p.lng}`]));
  const stops = [];
  for (const r of schedule) {
    if (!r.maps || stops.at(-1)?.label === r.maps) continue;
    stops.push({ label: r.maps, q: pins.get(r.maps) ?? r.maps, pinned: pins.has(r.maps) });
  }
  return stops;
}

const enc = encodeURIComponent;

export function routeLinks(stops) {
  const links = [];
  let origin = null;
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
