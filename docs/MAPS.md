# Mapping a trip

Written 2026-10-30, worked out on Newfoundland. This is the checklist for putting any trip on a map: the site's Map tab, plus an animated Kepler file. Newfoundland is the reference; when a step is unclear, look at what it produced (`trips/newfoundland-2027/places.yaml`, `routes.yaml`, `routes/`).

```
pins (Colin, Pin Ledger)  →  places.yaml  →  roads (tools/roads.py)  →  routes.yaml + routes/*.gpx
                                   │          coast (tools/coast.py)  →  coast.json
                                   └───────────────→  build  →  site Map tab · site/maps/*.geojson · *.kepler.json
```

Who does what: **Colin** drops pins and decides beds. **Claude** does everything else and says what's missing. No step invents a place: a stop nobody has placed is skipped and counted, never guessed.

## The loop

### 1. Find the gaps (Claude)

- `node tools/geojson.mjs --todo` lists every unplaced place on upcoming trips with its Maps search.
- Then check the schedule: **a `📍` stop with no `places.yaml` entry can never be pinned.** Add each one to `places.yaml` (unplaced, with a note naming its day). On Newfoundland that was 16 stops, including Gander, Twillingate, St. John's and Ferryland.
- Add **home** as a place with `home: true` (it opens day 1 and closes a last day with no bed), and any **ferry terminal** a crossing ends at. A ferry row needs a `📍` at the far side or the crossing can't be drawn.
- List the **undecided beds** (`TBD` overnights). They're Colin's decisions, not pins. Ask about them, multiple choice. A bed with no fixed place yet (an unbooked apartment, a family address nobody wrote down) can take **`mapStandIn: <placed place name>`** on its overnight, if Colin picks a stand-in: the day ends there and the day card says it's a stand-in. Swap it for the real place when it's booked.
- **Flights are `fly` rows**, with the landing airport as the `📍`. The hop draws as a great-circle arc (dotted on the Map tab), `roads.py` never drives it, and the Google Maps links break at the airport. A flight to an unplaced airport still flies, landing at the next placed stop.
- Rows timed **`option`** or **`fallback`** are alternatives, so they're not route stops. `optional` add-ons still are. A day that's all alternatives (pick one of two) has no line until it's picked.

### 2. Pins (Colin, about 30 seconds each)

Claude seeds the new places into the **Pin Ledger** (https://claude.ai/artifact/79opjP1N8qdZqLrR5ifdUT, private; source `tools/coordsheet.html`). For each: **Find in Maps** → check it's the right spot (the trailhead lot, not the summit) → long-press → copy → paste. The ledger flags a pin that's thousands of km off (swapped numbers or a lost minus sign), one copied from a map's center, a coarse one, and one identical to another place's (a stale clipboard: it caught Gallarus Oratory).

**"Not a pin"** is for something that isn't one spot (a whole harbour, a road).

Colin says **"pins are in"** when done. Or, without the ledger, paste `Name: lat, lng` lines into the chat.

### 3. Import (Claude)

Read the ledger's saved pins and check them before writing:
- No two places at the same coordinates.
- Nothing far outside the trip.
- No leftover warnings. A saved warning means look closer, not reject.

Write each pin into `places.yaml` as `verified: true`, `source: Google Maps dropped pin, via the Pin Ledger (Colin, <date>)`. Change only the `verified`/`lat`/`lng`/`source` lines (keep the file's own indentation). Hold back anything suspect, reset it in the ledger, and say which.

### 4. Roads (Claude, about a minute)

`node tools/build.mjs`, then `python3 tools/roads.py <slug>` (needs `pip install pyarrow shapely networkx numpy pyyaml`).

Every routing service is blocked from a session (OSRM, Valhalla, OpenRouteService and Geofabrik, tested 2026-10-30), but **Overture Maps' road data on S3 is reachable**. So the tool pulls the roads in the trip's box (major roads everywhere, every road within ~4 km of a stop), builds the network and finds the fastest path between each day's stops, ferries included. It writes `routes/day-N.gpx` and `routes.yaml` with the source.

**Flights:** each stretch of ground between flights (Ireland, Marseille) gets its own road pull, and a stop snaps to any network of 200+ nodes, not only the biggest. The GPX writes a flight as its own `<trk>` with `<type>fly</type>`.

**Ferries:** on a day whose plan has a `ferry` row, when both ends of a leg sit within 3 km of the ends of one ferry line, the leg takes that sailing, even if driving round to another ferry is quicker on paper. Without that rule, day 27 skipped the Argentia overnight ferry and drove across the island to Port aux Basques. To route a ferry leg, put the far terminal on the ferry row's `📍`.

A stop more than 3 km from any road in the first pull (a campground at the end of a long forest road, like West Tensleep Lake) gets a second, wider pull of minor roads around it, ~25 km, so its own road joins the network.

Re-run it whenever pins or beds change; days that didn't change come out the same.

### 4b. Coast (Claude, a few minutes)

After the roads: `node tools/build.mjs && python3 tools/coast.py <slug>`. It pulls Overture's land polygons (built from the OpenStreetMap coastline, metre-level) inside a corridor of 12 km around each pin and 5 km either side of each road line, simplifies to ~15 m, drops islets under ~1 ha, and writes `trips/<slug>/coast.json` with its source. Corridor pieces with no sea (inland) are dropped, so an inland trip gets no file. Re-run after pins or roads change.

The page ships it as integer deltas (~10 m steps), about a quarter the size of plain numbers. Newfoundland, the worst case, is the biggest piece of the page.

**Check:**
- Each day's miles against the plan's `driving:` line. Road miles run ~1.3–1.7× straight-line.
- A ferry flag only where the plan has a crossing.
- No gap between one day's end and the next day's start.
- Draw it once and look. A straight run across water should be a real ferry.

**To pin one day to a route Colin chose:** open the day's Directions link, drag Google's route, convert the URL at maptogpx.com (or gpx2maps.com, mapstogpx.com), replace that day's GPX, and change its `source`.

### 5. Build and look (Claude)

`node tools/build.mjs` writes:

| Output | What it is |
|---|---|
| The site's **Map tab** | Coastline, every day's line and pin, drawn in the page: works offline and inside the claude.ai page. Tap a day, line or pin to zoom to that day and get its card (miles, driving, bed, stops, Day plan link, Google Maps route, **Satellite ↗**). Each road line is simplified at its own day's scale, not the trip's. |
| `site/maps/<slug>.kepler.json` | The animated map. Drag onto kepler.gl/demo on a computer. |
| `site/maps/<slug>.geojson`, `-trip.geojson`, `all*.geojson` | Raw data for Felt, geojson.io or Kepler by hand. |
| `site/packs/<slug>.gpx` (`node tools/pack.mjs <slug>`, not run by build) | The field copy: every verified pin plus one track per day that has a road line, named "Day N · title". Import into Organic Maps for routes with no signal. Straight pin-to-pin lines are left out. |

**Check before calling it done:**
- `npm test`: coordinates and routes have sources, Kepler files bind, the coastline keeps its islands.
- Screenshot the Map tab at phone width in light and dark mode: whole trip, then one day.
- Load the Kepler file through Kepler's own code (the headless check used on 2026-10-30).
- Read the "No line yet for day…" line on the whole-trip card. That's what's still missing, and it goes back to step 1.

### 6. Ship

Commit with the pins' and routes' provenance in the message, push, PR. Republish the site after Colin merges (CLAUDE.md).

## What each piece is and isn't

- **Road lines are plausible, not navigation.** One-way streets, turn rules and closures are ignored, speeds are guesses by road class, and the hop from a pin to the nearest road is straight.
- **A day after an undecided bed starts where the day before ended** (`startGuessed`). The day card says so.
- **The coastline is two layers.** Along the route (`coast.json`) it's the OpenStreetMap coastline at ~15 m: harbours, jetties and coves. Everywhere else it's Natural Earth 1:10m, about a kilometre of detail. The seam between them can show at a corridor's edge.
- **Satellite is a link, not a layer.** The claude.ai page can't load outside images, so the day card and each placed pin on the Places tab link to Google Maps' satellite view.
- **The animation clock is fake.** Each day plays 01:00–23:00 on its date at constant speed along its line: order and distance, not time of day.
- **Only placed pins draw.** A day with fewer than two placed stops (or a decided bed) has no line.
- **Bus-and-flight trips** (Dingle–Marseille) route their ground by road. Read the bus and metro lines as "between here and there", not the bus's path. Flights are arcs, and the offline pack leaves them out.
- **A stand-in bed is a placeholder,** not where anyone sleeps.

## Kepler and Felt by hand

Only for building a different view:

- **Kepler:** load `<slug>-trip.geojson` and `<slug>.geojson`. Set the first to a **Trip** layer colored by `day`, with a trail length of a day or more. Filter the pins on `time` with an **Incremental** window. Tooltip `name`, `day`, `title`, `note`.
- **Felt:** drag in `<slug>.geojson`, style by `day`. Filter `role = camp` for a nights-only view.
- Loading by URL from GitHub Pages is untested (it needs Pages' CORS headers). Downloading the file and dragging it in always works.

## Done 2026-10-30: zoom detail and satellite

Colin's screenshot showed both causes of "blocky": road lines simplified at the whole trip's scale (~400 m on Dingle–Marseille) and a coast simplified to a few km per vertex, plus a page that rounded every point to 1/10,000 of the map's width. Fixed by per-day simplification, a finer coarse coast (`basemap.mjs`, 1/3000 of the box), two-decimal projection, and `coast.json` along the route. Satellite went in as links (option 1 of 3); real tiles (Sentinel-2 or Esri) would only ever work on the GitHub Pages copy, with signal, and weren't built.
