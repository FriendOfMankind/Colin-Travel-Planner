# The website: review of the old one, and what the new one does differently

Written 2026-09-28 from screenshots of the live Trees site at phone width (390 px) and desktop width (1280 px), not from reading its code.

## What the old site gets right (keep)

- **It's honest.** It shows unverified places as unverified, flags warnings, and tells you what it doesn't know. The new site inherits this because it renders the same data.
- **Offline, print and export.** It works with no signal. The new site has to match that before it can replace the old one.
- **Maps search links on every stop.** They're the most useful field feature, and the new site keeps them on every schedule row and every place.
- **Computed facts.** Sun times and booking windows are computed, never typed in.
- **It looks like it was made with care.** Real type, per-trip colour.

## What doesn't work (fix)

1. **It's organised by data type, not by what you're doing.** A trip page has **12 tabs** (Overview, Itinerary, Places, Map, Lodging, Hikes, Sun/Moon/Weather, Food & Cooler, Packing, Reservations, Open Questions, Notes). The same fact lives in several of them: the tonight's-campsite details sit in Overview, Lodging, the day card and Reservations.
2. **There's no "today".** In the field, reaching Day 4 means opening Itinerary and scrolling about **8,000 px**. The page doesn't know what day it is.
3. **The hub is 29,616 px tall on a phone**, about 35 screens. All 39 trips are big cards, and 33 of them are wishlist ideas.
4. **Research prose is mixed into instructions.** One schedule row for Kaymoor is a 90-word paragraph. At a trailhead you need "7:55 Kaymoor Miners Trail · 2h · Maps"; the reasoning belongs one tap away.
5. **Nothing from the new repo shows up:** logs, retros, preferences, the staples menu. The old site can't show memory.
6. **Emoji as icons** make it read as a hobby page rather than a tool.

## The new structure (prototype v1)

Four places, in a bottom tab bar:

| Tab | Job |
|---|---|
| **Now** | Knows the date. **During a trip** it shows today's card with a "Next up" line, the schedule, tonight's site and light. **Before a trip** it shows a countdown plus a *Before you go* list (unchecked checks, open questions, gear still `need`/`unknown`). Recent log entries go below either one. |
| **Trips** | Compact rows grouped as On the road / Coming up / Done. Ideas stay short. |
| **Kitchen** | The staples menu with computed macros per meal and a daily target. |
| **Me** | The `me/` files, readable. Gear shows state pills. Changes happen through `/remember`, not by editing on the site. |

A trip has **4 sections instead of 12**:
- **Plan:** day timeline. Each day is one line until opened, and today opens on its own. Schedule rows show time, kind, a short title, the duration and Maps, with the reasoning under "Details". Route and "why the plan looks like this" fold away at the bottom.
- **Places:** every place, located or search-only, plus hikes.
- **Prep:** bookings, checks, open questions, food and shopping stops, packing and weather. The checkboxes save on the phone only; the files are the record.
- **Journal:** the retro and the log.

Design tokens: topo-map neutrals, a forest accent, blaze yellow reserved for *today*, and a separate warning red. The type is Barlow Condensed (signage), IBM Plex Sans (reading) and IBM Plex Mono (times and numbers). There's a light and a dark theme.

## v2 (2026-09-28): what the site is for, per Colin

*"At a trailhead I'd be looking at AllTrails… I use this site to PLAN trips and make sure I'm on pace during the trips, and the AI to ask about alternatives if something comes up."*

So the site is **a planner and a pace check, not a field navigator**:
- **Trip at a glance** (top of Plan): one row per day with wake time (early alarms highlighted), hours on foot versus driving as bars, and the overnight. Overloaded days and alarms show up before they're lived. Optional rows don't count.
- **Now during a trip = pace check:** *the plan has you at…*, the next item, time to sunset, tomorrow's first item, and the slack line under "if you're behind".
- **Ask Claude about this day:** copies a ready-made question with the day's context, for pasting into the Claude app.
- **AllTrails links** on hikes instead of trying to be a trail app.

## v3 (2026-09-30): the bucket list and the horizon

Colin: *"a comprehensive bucket list of little things here and there"*, next to the trip list, with potential trips kept separate from it.

- **A fifth tab, Bucket**, renders `bucket.yaml`: single places filtered by want/done, kind and state, grouped by state. Done items show his verdict.
- **Trips → Potential trips** are grouped by the horizon test (Only now · Confirmed · Keeps · Weekend) instead of A–Z. Month and drive/fly filters stay.
- **A trip's Places section** lists its bucket items, plus the wanted ones in the trip's `states` that aren't on the plan. **An idea page** lists the items that point to it.

## v4 (2026-10-29): offline, the field card, booking windows

Colin asked for four things: works with no signal, a today view for the field, a booking calendar, and a faster page.

- **Offline, on GitHub Pages.** `.github/workflows/pages.yml` builds `site/` on every push to `main` and deploys it. The build also writes `sw.js` (a service worker: the page is network-first with a 4-second fallback to the cached copy, so a new build shows up whenever there's signal; the cache is named by a hash of the build), `manifest.webmanifest` and icons for the home screen, and `booking-alarms.ics`. The page registers the worker only when served over http(s) from somewhere other than claude.ai, so the claude.ai copy and a saved file behave as before. Fonts are now the phone's own (no Google Fonts), so the page makes no external request. A line at the top of every view says online or offline and when this copy was built.
- **The field card.** During a trip, Now is one card: time to sunset (and to dark after sunset) from the computed sun table, tomorrow's first item, today's schedule as compact rows (start, title, duration, Maps) with the current row marked *Now*, the next one highlighted and past ones dimmed, tonight's camp with its Maps link and confirmation, the slack line, the day's warnings, and the day-route buttons. Rows struck through in `trip.md` show as *Cut* and no longer count as the next item. The full day (food, light table, "why this day") is one tap away under *Whole day*.
- **Booking windows** (`#book`, linked from Now). The same computation as `tools/now.mjs` (`tools/lib/booking.mjs`, run at build time), grouped on the phone's own date: open now · opens soon (date, days to go, the ET release time when known) · bookable anytime · window unknown. *Download .ics* gives `tools/ics.mjs`'s own output.
- **Smaller.** The data blob only escapes `</` now (it used to escape every `<`), and fields no view showed are no longer shipped: a trip's subtitle, theme, tags, nights, distance, budget, the day type, a place's source and the sun table's location and moon columns, an idea's tags, budget, target and teaser, a `me/` file's topic. 1,117 KB → 1,048 KB (gzip 325 → 318 KB). The rest is content Colin can open. Without the web fonts, a local load went from about 990 ms to about 65 ms.
- **Next trip on Now** falls back to a trip's `target` date, as the briefing does, labelled "target, not booked".

## Not built yet

Trees was frozen on 2026-09-29, so these are now gaps, not a checklist for replacing it.

- **GitHub Pages is off.** It needs Settings → Pages → Source: GitHub Actions, once, by Colin. Until then the offline copy only exists on a local server.
- **The map view:** vendored Leaflet, verified pins only, routes where they're generated.
- **The free-window Calendar** from Trees.
- **Search.**
- **Print and GPX on the site.** `tools/pack.mjs` makes them per trip; the site doesn't link them yet.
