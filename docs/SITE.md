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

## Not built yet (before it can replace Trees)

- **Offline:** a service worker and bundled fonts. Right now the fonts come from Google, and the prototype is a published preview, not the Pages site.
- **The map view:** vendored Leaflet, verified pins only, routes where they're generated.
- **The agenda / booking-window calendar** from Trees' `derive.js`, and the free-window Calendar.
- **Search.**
- **A GitHub Action** to build on every push to `main` and deploy to Pages.
- **Print, GPX and ICS exports.**
