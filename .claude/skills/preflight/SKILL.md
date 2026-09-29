---
name: preflight
description: Read-only pre-departure check for an upcoming trip at T-14, T-7 and T-1 (open calls, bookings, gear gaps, contradictions inside the plan, weather once it's forecastable). Use when Colin says "/preflight", "preflight", "am I ready", "what's left before <trip>", or a trip starts within 30 days.
---

# /preflight: what's left before we leave

**Read-only.** Preflight finds problems; it doesn't fix them. The report goes in the reply. Fixes happen afterwards, with Colin's say-so, through the normal routes: `trip.md` via Trees and re-import during migration, `me/` via `/remember`, decisions and findings via `log.md`.

## 1. Which trip, and how far out

- `date +%F`. **Never guess the date.**
- The trip is the next `planned` entry in `INDEX.md` (or the one he names). Compute T-minus from `start:` in its `trip.md` frontmatter.
- The bucket sets the emphasis:
  - **T-30 to T-8:** calls, bookings, purchases, contradictions. Anything that needs shipping time is urgent now.
  - **T-7 to T-2:** add the weather (step 5), pre-mix and packing, burn bans.
  - **T-1 / day of:** only what can still change: road conditions by phone, charging, ice, printing, texting the plan home.

## 2. Read, in this order

1. `trips/<slug>/trip.md`: frontmatter (`booking`, `nights`, `next`), **Reservations & checks**, **Open questions**, **Packing**, **Provisions**, and every Day's `slack:` and `!` lines.
2. `trips/<slug>/log.md`: **every entry after the last Trees import.** Decisions and "pending in Trees" lists there **override `trip.md`** until re-import. Say so whenever you rely on one.
3. `me/gear.md`: every item with `state: need` or `unknown`, and any `question:` with `answeredBy: <slug>`.
4. `me/checklist.md`: the universal list, run against this trip.
5. `me/calendar.md`: make sure no trip day is a class day, apart from the known remote lecture.

## 3. Cross-check the plan against itself

This is the part a human misses. Check each of these and report only the mismatches:

- Frontmatter `nights:` and `booking` vs the Lodging table vs the Reservations checklist.
- Each open question: is it already answered somewhere else (hike table, a Day, the log)? If so, it's **stale**, not open.
- The Packing and Provisions lists vs the actual meal lines (`- B:` / `- L:` / `- D:`): anything bought or pre-mixed that no meal uses, or any meal whose ingredient isn't on a list.
- Every item in the plan vs `me/gear.md` state: the plan assumes an item that gear marks `need`/`unknown`.
- Anything that has a `(was: …)`, a strikethrough or a "decided" entry in the log but still reads the old way in `trip.md`.

Cite both locations for every mismatch (`trip.md` § Packing vs `me/gear.md` · Cooler). **Don't pick a winner.** Name both sides.

## 4. Sort what you found

| Tier | What goes here |
|---|---|
| **🔴 Blocks a day** | An unmade call or booking that a Day depends on; a no-water or no-signal night without its prep. |
| **🟠 Buy / confirm** | Gear `need`/`unknown` that the plan uses, most of all anything on a cold, wet or no-service day. Say whether shipping time still works at this T-minus. |
| **🟡 Stale in the plan** | The contradictions from step 3. |
| **⚪ Later** | Checklist items that belong to a later bucket. List them in one line and move on. |

Phone numbers go next to the call they're for, copied from the plan. **Never invent one**, and never invent an hour, price or window (non-negotiable 2).

## 5. Weather (T-10 and closer only)

Use the AccuWeather tools for the camp nights that matter most: the coldest ones, the exposed summits, the no-service nights. Report forecast lows against the plan's Weather table and the sleep system's tested range in `me/gear.md`. Label them **forecast** with the fetch date. Beyond ~10 days it's climate, not forecast, so say that and skip it.

## 6. Reply

- First line: `<trip> · T-<n> · <count> blocking · <count> to buy · <count> stale`.
- Then the tiers, with the most urgent first inside each. One line per item, citing a file.
- End with a **multiple-choice** offer for what to do next, e.g. (a) write the stale list to `log.md` as "pending in Trees", (b) `/remember` a gear change, (c) nothing.

If he picks (a), write it as a normal log entry and save it the way `/log` does, including its "verify it landed" step.
