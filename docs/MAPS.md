# Maps: from the files to Kepler and Felt

Written 2026-10-30. The pipeline is three steps, and only the first one needs you.

```
you: coordinates + road GPX  →  places.yaml, routes.yaml  →  tools/geojson.mjs  →  site/maps/*.geojson  →  Kepler / Felt
```

## 1. Place the pins (the actual bottleneck)

`node tools/geojson.mjs --todo` lists every unplaced place on an upcoming trip, with the Google Maps search for it. Finished trips are left out *(Colin, 2026-10-30: no need to do past trips)*. That list is the work queue.

**The easy way: the Pin Ledger** (https://claude.ai/artifact/79opjP1N8qdZqLrR5ifdUT, private to Colin). Every unplaced place has a Find in Maps button and a paste box. It saves as you go, and it flags pins that land far from the trip, that came from a map's center instead of a long-press, or that are too coarse. When you're done, tell Claude "pins are in". Claude reads the ledger's saved data, writes each pin into `places.yaml` with its source, and re-seeds the ledger from the new todo list. The page's source is `tools/coordsheet.html`.

**Or straight into the chat**, for each place:

1. Search it in Google Maps (the `search:` text from the list).
2. Check it's the right spot: the trailhead lot, not the summit; the campground entrance, not the town. Satellite view settles most of these.
3. Long-press the exact spot. The coordinates appear in the search bar. Tap them to copy.
4. Paste into the chat, one per line:

```
Stone Cliff Campground: 37.9431, -81.0632
Kaymoor Top: 38.0466, -81.0835 (the lot, not the trail)
```

Claude writes each one into that trip's `places.yaml` as `verified: true` with `source: Google Maps dropped pin (Colin, <date>)`. Anything after the coordinate goes in the note. Claude never fills one in itself: no geocoding host is reachable from a session (CLAUDE.md, "Limits").

Batches of 10–20 at a time are fine. Do the places on a day's route first, since those are what draw the lines.

## 2. Road lines (optional, per day)

Without this, a day's line runs straight from stop to stop. That's honest and fine for "where am I going", but it isn't the road. Every routing service (OSRM, Valhalla, OpenRouteService) is blocked from a session, tested 2026-10-30, so road geometry has to come from you:

1. On the site, open the day. Its **Directions** links are Google Maps routes already, camp to camp, through the day's stops.
2. Open the link and drag the route if Google picked the wrong road.
3. Paste the URL from the address bar into a Google-Maps-to-GPX converter: maptogpx.com, gpx2maps.com or mapstogpx.com (all free, no sign-up, found 2026-10-30; I haven't tested how accurate any of them is). Download the `.gpx`.
4. Send it to Claude, or drop it into `trips/<slug>/routes/day-<N>.gpx`, and list it in `trips/<slug>/routes.yaml`:

```yaml
- day: 4
  file: routes/day-4.gpx
  source: Google Maps directions → maptogpx.com (Colin, 2026-11-02)
- day: 7            # a long day split across two Google links
  files: [routes/day-7a.gpx, routes/day-7b.gpx]
  source: Google Maps directions → maptogpx.com (Colin, 2026-11-02)
```

A route with no `source` fails `npm test`, the same rule as coordinates.

## 3. Build and look

`node tools/build.mjs` (or `node tools/geojson.mjs` on its own) writes `site/maps/`:

| File | What it is | Use it in |
|---|---|---|
| `<slug>.geojson` | Pins (camps, stops, other verified places) and one line per day, colored by day | Felt, Kepler (static), geojson.io, uMap |
| `<slug>-trip.geojson` | The day lines only, each vertex timestamped | Kepler's **Trip** layer (the animated trace) |
| `all.geojson`, `all-trip.geojson` | Every trip at once | The "everywhere I'm going" map |

Pages publishes them on every push to `main`, at `https://friendofmankind.github.io/Colin-Travel-Planner/maps/<file>`. Kepler and Felt can load straight from that URL. *(Untested: it needs GitHub Pages to send CORS headers, and the session couldn't reach github.io to check. If it fails, download the file and drag it in instead.)*

### Kepler.gl, the animated version

1. Open kepler.gl/demo (a desktop browser; it's heavy on a phone). **Add Data → Load Map using URL** (or drag in the files): load `<slug>-trip.geojson` and `<slug>.geojson`.
2. On the `-trip` dataset, set the layer type to **Trip**. Color it by `day`. The play bar appears at the bottom. Set the trail length long enough that a whole day's line stays drawn.
3. On the pins dataset, add a **Filter** on `time` and pick **Incremental Time Window**, so pins appear as the trace reaches them and stay there.
4. Tooltip: `name`, `day`, `title`, `note`. Base map: a satellite or terrain style.
5. Share/Export → **Export Video** for a clip, or Export Map → HTML for a self-contained file.

Features arrive with `lineColor`/`fillColor` set, which Kepler picks up as each day's color.

### Felt, the clean shareable version

Drag in `<slug>.geojson`. Style the points and lines by `day` (categorical). Filter on `role` = `camp` for a nights-only view. Each feature carries `stroke` and `marker-color` too (the simplestyle convention), but I haven't checked whether Felt uses them.

## Honest limits

- **The clock is fake.** Each day's stops are spread from 08:00 to 18:00 on that day's date, so the animation shows the *order and the day*, not when anything happens. Schedule times aren't parsed: too many are "morning" or "+45m".
- **Only verified places are drawn.** A skipped stop is counted on its day's line (`skipped`), not guessed. A day with fewer than two placed stops has no line.
- **Dingle–Marseille is buses and flights.** Its lines will be straight (bus routes don't come out of Google driving links), and that's the right shape for it.
- **Camps appear once per day they touch**: as the night's stop, and again as the next morning's start. That's right for playback. In Felt, filter by day if they stack.
