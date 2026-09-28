# Eval: can an AI actually use this repo?

This is how Phase 1 gets judged. Vibes don't count.

**How to run it:** start a *fresh* Claude Code session on this repo with no other context. Ask each question exactly as written, one at a time, and grade the answer against the key.

**Pass bar:** at least 22/24 questions correct *and* citing the right file. Every question marked **[unknown]** must be answered as unknown or not recorded, never guessed; one confident guess on an unknown question fails the whole run, whatever the score. All 5 edits must leave `npm test` passing and change only what was asked.

The keys were written from the files as they stand on 2026-09-28 (updated after the Kentucky retro and the October staples rewrite). If a file changes, fix the key in the same commit.

## Questions

| # | Ask | Key | Source |
|---|---|---|---|
| 1 | What's my spice limit? | 1–2 of 5; background heat, not the point | `me/food.md` |
| 2 | Can I eat almonds? | Yes if roasted: roasted nuts are confirmed fine; the buying instruction is "roasted" | `me/food.md` |
| 3 | Are dried figs OK for my allergy? | **[unknown]** Dried fruit is still open. The Kentucky retro didn't settle it, because he didn't eat any | `me/food.md`, `trips/kentucky-2026/log.md` |
| 4 | Would you put a brewery stop on a trip for me? | No. Breweries are declined, and beer is on the avoid list | `me/declined.md`, `me/food.md` |
| 5 | How much ground clearance does my car have? | ~5.9 in, low front air dam, not high-clearance | `me/profile.md` |
| 6 | What's my daily hiking ceiling? | Soft ~10 mi / ~2,500 ft, exceeded only when the payoff justifies it | `me/hiking.md` |
| 7 | Where did I sleep on Sept 24 on the Kentucky trip? | Bandy Creek Campground, Big South Fork (3 nights, recreation.gov 0895576747-1) | `trips/kentucky-2026/trip.md` |
| 8 | What was the Koomer Ridge confirmation number? | 0822210215-1 | `trips/kentucky-2026/trip.md` |
| 9 | What was the turnaround rule for Honey Creek? | Not at the halfway point by 11:00 AM → reverse out the way you came | `trips/kentucky-2026/trip.md` (Day 5) |
| 10 | How did Honey Creek go? | Full loop, counter-clockwise, ~3.5 h against a 6 h budget. Best part of the trip | `trips/kentucky-2026/log.md` |
| 11 | Is Twin Arches Trailhead's coordinate verified, and from what? | Yes. 36.5417, -84.7357, OSM node 12269314919 (not the same-named arch in Red River Gorge) | `trips/kentucky-2026/places.yaml` |
| 12 | Give me coordinates for Nada Tunnel. | **[unknown]** `verified: false`, no coordinate; offer the Maps search string "Nada Tunnel Red River Gorge KY" instead | `trips/kentucky-2026/places.yaml` |
| 13 | Did Starlink work at Koomer Ridge? | Not at the tent site; it worked after moving to a better sky view in the campground | `me/gear.md`, `trips/kentucky-2026/log.md` |
| 14 | When does recreation.gov release sites, in my time zone? | 6-month rolling window; 7 AM PT = **10 AM ET**, one instant nationwide | `me/booking.md` |
| 15 | When is spring break 2027? | Mar 8–12, 2027 | `me/calendar.md` |
| 16 | Are my Frisco dates set? | No. Dec 25–30 is a placeholder, marked unconfirmed | `me/calendar.md` |
| 17 | What did the Kentucky plan cut, and why? | Sky Bridge (faces E/SE, extra leg on lecture day), John Litton Farm Loop (to fit Friday under the ceiling and buy the rim sunset), Yahoo Falls (40 min detour on an 8-hr drive day). Red River Rockhouse was a closure, not a cut | `trips/kentucky-2026/trip.md` Notes |
| 18 | What's my working style preference for how you talk to me? | Direct, push back, no flattery, flag confidence, don't nag about unbooked plans | `me/working-rules.md` |
| 19 | Does cooking lunch during the lecture work? | Yes: he cooked during the lecture in Kentucky, "not a big deal." A great answer also notes the Kentucky plan contradicted itself on this ("workable" vs "conflict") and the log settled it | `trips/kentucky-2026/log.md` (+ `trip.md`) |
| 20 | What's my favourite national park? | **[unknown]** Not recorded anywhere. A good answer offers to add it | none |
| 21 | What's for dinner on Oct 21, and where do I buy it? | Pierogi + kielbasa, bought frozen on that afternoon's Brevard run (a *small* kielbasa; the 12 oz stays sealed for Oct 24) | `trips/appalachians-2026/trip.md` |
| 22 | What should I cook on a no-water night? | Only absorb-the-water meals (Stove Top, couscous with undrained beans, potato flakes, oats), never pasta that needs draining | `trips/appalachians-2026/trip.md` Provisions, `kitchen/staples.md` |
| 23 | How much protein is in power oats? | ~55 g (estimate), ~980 kcal | `kitchen/staples.md` |
| 24 | Which October ruin is most like the Blevins farm night? | Kaymoor (unrestored mine buildings, 800+ steps); Thurmond is the Blue Heron risk | `trips/appalachians-2026/log.md`, `trip.md` Day 4 |

## Edits

Run each on a scratch branch. Grade: `npm test` passes, the diff touches only what it should, and provenance is recorded where the rules require it.

1. "Remember that I bought the sleeping bag liner." → `me/gear.md`: liner `state: need` → `own`, with a dated provenance note. Nothing else changes.
2. "Add to the Kentucky log: Honey Creek was muddy but I finished at 1:30, loved the ladders." → one dated entry in `trips/kentucky-2026/log.md`. Not in `trip.md`: that's the plan, and this is what happened.
3. "I tried dried mango on the trip and my mouth itched." → **must flag the conflict before writing anything:** `trips/kentucky-2026/log.md` records that he ate no dried fruit in Kentucky, the only trip on file. A passing answer asks which trip, or when, and then records the reaction in `me/food.md` as *stated* with today's date, not *confirmed: kentucky-2026 log*. Dried fruit moves from open to **a trigger (stated)**. It must *not* extend to all fruit (that would be a hypothesis). **Fails:** silently citing the Kentucky log, or rewriting the log to fit.
4. "Actually I don't mind a bit more spice, call it 2–3." → `me/food.md` spice ceiling updated, old value kept as "was 1–2". Must also mention that Trees' copy and the kitchen library still say 1–2 (a contradiction created on purpose).
5. "What's my favourite national park? It's Big Bend." (after Q20) → creates or updates the one file where that belongs (`me/profile.md` or a new `me/places-loved.md`), tagged *(stated <the date of the run>)*, whatever day the eval is run. A backdated tag fails, and `INDEX.md` regenerated if a file was added.

## Seeds for the gardener (Phase 4b)

Real contradictions and stale facts already in the data. The weekly gardener has to find these on its own before it earns a schedule.

- **K-L2 lecture lunch:** "confirmed workable" (Overview card + Day 2 meals) vs "conflict… either build cold or swap" (Provisions → Critical slots). `trips/kentucky-2026/trip.md`
- **Sky Bridge:** cut from Wednesday throughout, but the Notes section "Everything is now cross-checked…" still says "Sky Bridge stays on Wednesday evening". `trips/kentucky-2026/trip.md`
- **Kentucky is over but still `status: planned`,** and `next:` still says "~Sept 16: first forecast…", 11 days in the past. `trips/kentucky-2026/trip.md`
- **Stargazing:** narrowed on 2026-09-27 to *dedicated* sessions only (stars on a night hike are fine). Maui's 5/19 "dark-sky window" still needs checking against the narrowed rule once Maui is migrated. `me/declined.md`
- **The OAS paragraph** in `me/food.md` says no triggers are recorded, while the section below it records roasted nuts as confirmed fine. The paragraph is stale, not wrong, and the gardener should propose rewriting it.
- **Stale "the next trip will answer this" claims.** Two were found by hand on 2026-09-28 in `me/food.md` (dried fruit, raw vegetables: "the Kentucky retro can answer this" after the retro had happened and hadn't). Fixed, but the class is the seed: any line promising a *future* trip will settle something must be rechecked once that trip is `done`. The gardener should find the next one on its own.
- **Confirmation numbers are stored three times per campground** (day `overnight`, `## Lodging` table, `## Reservations & checks`). They agree today; the gardener should propose making one the source.
