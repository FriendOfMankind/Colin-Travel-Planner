# Mapping a trip

Written 2026-10-30, worked out on Newfoundland. This is the checklist for putting any trip on a map. Newfoundland is the reference; when a step is unclear, look at what it produced (`trips/newfoundland-2027/places.yaml`, `routes.yaml`, `routes/`).

**Three maps, one per situation** *(decided with Colin, 2026-10-30)*:

| Where | Map | Why |
|---|---|---|
| **Phone, with signal** | **Google My Maps** (`site/maps/<slug>-lines.kml` + `-pins.kml`) | Satellite, real roads, your location, tap a pin for its day and note. Needs signal. |
| **Phone, no signal** | **Organic Maps** (`site/packs/<slug>.gpx`) | Fully offline once the region is downloaded. Pins plus each day's road line. |
| **Computer** | **Kepler** (`site/maps/<slug>.kepler.json`) | The animated whole-trip view. |

The site's own Map tab is gone: it lagged badly on a phone. The day cards keep **Day route ↗** (Google Maps directions) and **Satellite ↗**, and each placed pin on the Places tab keeps **Maps ↗** and **Satellite ↗**.

```
pins (Colin, Pin Ledger)  →  places.yaml  →  roads (tools/roads.py)  →  routes.yaml + routes/*.gpx
                                   └───────────────→  build  →  site/maps/*.kml · *.kepler.json · *.geojson
                                                     pack   →  site/packs/<slug>.gpx
```

Who does what: **Colin** drops pins and decides beds. **Claude** does everything else and says what's missing. No step invents a place: a stop nobody has placed is skipped and counted, never guessed.

## The loop

### 1. Find the gaps (Claude)

- `node tools/geojson.mjs --todo` lists every unplaced place on upcoming trips with its Maps search.
- Then check the schedule: **a `📍` stop with no `places.yaml` entry can never be pinned.** Add each one to `places.yaml` (unplaced, with a note naming its day). On Newfoundland that was 16 stops, including Gander, Twillingate, St. John's and Ferryland.
- Add **home** as a place with `home: true` (it opens day 1 and closes a last day with no bed), and any **ferry terminal** a crossing ends at. A ferry row needs a `📍` at the far side or the crossing can't be drawn.
- List the **undecided beds** (`TBD` overnights). They're Colin's decisions, not pins. Ask about them, multiple choice. A bed with no fixed place yet (an unbooked apartment, a family address nobody wrote down) can take **`mapStandIn: <placed place name>`** on its overnight, if Colin picks a stand-in: the day ends there and the day card says it's a stand-in. Swap it for the real place when it's booked.
- **Flights are `fly` rows**, with the landing airport as the `📍`. The hop is a great-circle arc in Kepler and left out of the KML and the offline pack, `roads.py` never drives it, and the Google Maps links break at the airport. A flight to an unplaced airport still flies, landing at the next placed stop.
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
| `site/maps/<slug>-lines.kml`, `<slug>-pins.kml` (`node tools/kml.mjs <slug>`, also run by build) | **Google My Maps**, two layers. Lines: one per day, colored by day (flights left out, so a flight day is two lines). Pins: each verified place once, named, with its days and note. Every feature carries the columns `kind` (day line / bed / stop / off-plan), `day` and `area`. My Maps keeps the line colors but draws every pin white, so the pins get colored from `kind` (below). They're separate files because a My Maps style covers a whole layer: grouping by `kind` in a shared layer would repaint every day line one color. |
| `site/maps/<slug>.kepler.json` | The animated map. Drag onto kepler.gl/demo on a computer. |
| `site/maps/<slug>.geojson`, `-trip.geojson`, `all*.geojson` | Raw data for Felt, geojson.io or Kepler by hand. |
| `site/packs/<slug>.gpx` (`node tools/pack.mjs <slug>`, not run by build) | The field copy: every verified pin plus one track per day that has a road line, named "Day N · title". Import into Organic Maps for routes with no signal. Straight pin-to-pin lines are left out. |

**Check before calling it done:**
- `npm test`: coordinates and routes have sources, Kepler files bind, every KML fits My Maps' import rules (no folders or MultiGeometries, under 5 MB) with each place once.
- Load the Kepler file through Kepler's own code (the headless check used on 2026-10-30).
- The build's per-trip line says how many days have a line. A day with none needs two placed stops (or a decided bed), which goes back to step 1.

### 6. Ship

Commit with the pins' and routes' provenance in the message, push, PR. Republish the site after Colin merges (CLAUDE.md). After the merge, GitHub Pages serves the KMLs at `https://friendofmankind.github.io/Colin-Travel-Planner/maps/<slug>-lines.kml` and `-pins.kml`, or Claude sends them in the chat.

## For Colin: Google My Maps (phone, with signal)

Do the import once per trip, on a computer. Google's help page shows the steps for a computer; whether the phone browser can import is untested.

1. **Get the two files.** `<slug>-lines.kml` and `<slug>-pins.kml`, from `https://friendofmankind.github.io/Colin-Travel-Planner/maps/` or the ones Claude sent you.
2. **Import both.** At [mymaps.google.com](https://mymaps.google.com) → **Create a new map** → under "Untitled layer", **Import** → `-lines.kml`. Then **Add layer** → **Import** → `-pins.kml`. Name the map after the trip.
   Then, once, on the **pins** layer only: **Uniform style** → **Group places by** `kind`. Beds and stops get their own colors and a legend. Tap the paint pot beside "bed" to pick a tent icon. **Set labels** → `name` writes names on the pins. *(Grouping by `day` colors pins by day instead.)* Leave the lines layer alone: it already has its day colors.
3. **Open it on the phone.** In the Google Maps app: **You** (or **Saved**) → **Maps** → the trip. Layers button → **Satellite**. Tap a pin for its day and note.

When the plan changes, the map doesn't update itself: delete the two layers and import the new files (then redo the grouping). *(Confirmed by Colin's imports, 2026-10-31: line colors carry over, pins import white, and `kind` shows up under "Group places by" (Newfoundland: 56 stops, 13 beds, 11 off-plan). Still recalled, not checked: My Maps live under Saved → Maps in the Google Maps app, and they don't work offline.)*

## For Colin: Organic Maps (phone, no signal)

1. **Download the region first, with signal.** In Organic Maps, search the area (e.g. Newfoundland) and download its map.
2. **Get the pack.** Claude runs `node tools/pack.mjs <slug> --pdf` and sends you `<slug>.gpx` (or puts it in Google Drive with the PDF, marked available offline).
3. **Open the GPX with Organic Maps** (share sheet → Organic Maps, or open it from Files). It lands as a bookmark list: every verified pin plus one track per day that has a road line. It all works with no signal.

## What each piece is and isn't

- **Road lines are plausible, not navigation.** One-way streets, turn rules and closures are ignored, speeds are guesses by road class, and the hop from a pin to the nearest road is straight.
- **A day after an undecided bed starts where the day before ended** (`startGuessed`). The day card says so.
- **The KML is a copy, not a link.** My Maps keeps what was imported. A changed pin or road reaches the phone only by importing the new file.
- **Satellite on the site is a link.** The claude.ai page can't load outside images, so the day card (framed to the day's pinned stops) and each placed pin on the Places tab link to Google Maps' satellite view.
- **The animation clock is fake.** Each day plays 01:00–23:00 on its date at constant speed along its line: order and distance, not time of day.
- **Only placed pins draw.** A day with fewer than two placed stops (or a decided bed) has no line.
- **Bus-and-flight trips** (Dingle–Marseille) route their ground by road. Read the bus and metro lines as "between here and there", not the bus's path. Flights are arcs, and the offline pack leaves them out.
- **A stand-in bed is a placeholder,** not where anyone sleeps.

## Kepler and Felt by hand

Only for building a different view:

- **Kepler:** load `<slug>-trip.geojson` and `<slug>.geojson`. Set the first to a **Trip** layer colored by `day`, with a trail length of a day or more. Filter the pins on `time` with an **Incremental** window. Tooltip `name`, `day`, `title`, `note`.
- **Felt:** drag in `<slug>.geojson`, style by `day`. Filter `role = camp` for a nights-only view.
- Loading by URL from GitHub Pages is untested (it needs Pages' CORS headers). Downloading the file and dragging it in always works.

## Changed 2026-10-30: the Map tab came out

The site drew its own map (Natural Earth coast, an OpenStreetMap coast corridor from `coast.py`, pan and zoom in SVG). It worked offline but lagged badly on a phone, and satellite only ever came as links. Colin chose to drop it for Google My Maps with signal, Organic Maps without, and Kepler on a computer. Gone with it: `tools/coast.py`, `trips/*/coast.json`, `tools/lib/basemap.mjs` and the `world-atlas` and `topojson-client` packages.
