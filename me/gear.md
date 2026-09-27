---
topic: gear
summary: What's in the kit, its state (own/need/replace/rent/unknown), and the questions only a trip can answer.
source: Trees@c6e693c data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)
---

# Gear locker

Gear `state`: "own" | "replace" | "need" | "rent" | "unknown"

A gear item may also carry `question: { text, answeredBy: "<slug>" }` — a
thing you will only find out by using it. The hub surfaces those as a
standing list, and the trip named in `answeredBy` answers it in its `retro`
block once it has happened. Before this existed the questions sat in prose
notes and were answered nowhere.

Two more optional item fields, used by the clothing categories:
  `qty`  — how many to PACK on a typical 5–10 night trip. Not an inventory
           count. `null` means the number has never been written down —
           it renders as "?" rather than a guess.
  `type` — garment/kit role: "shell", "midlayer", "base", "socks", etc.

## Sleep system

Rebuilt for cold in 2026. This was the weak link and no longer is — the only open item is the liner.

```yaml
- name: REI Co-op Siesta 20 sleeping bag
  state: own
  note: New, Sept 2026. First cold-weather bag. Sept KY is the shakedown for the October 30s.
  question:
    text: Does it actually sleep warm enough to trust at 32°F?
    answeredBy: kentucky-2026
    answer: "Partly. Warm with no issues at ~50°F. The 32°F half is still untested; Kentucky never got that cold. (confirmed: kentucky-2026 log, 2026-09-27)"
- name: Sleeping bag liner
  state: need
  note: "For the last three October nights (Linville and Hurricane, mid-30s). **Decided 2026-09-27: buying one**, as margin, because Kentucky could not test the bag near freezing. Flip to `own` once bought; needed before Oct 15."
  question:
    text: Is it needed, or does the Siesta 20 cover the mid-30s on its own?
    answeredBy: kentucky-2026
    answer: "Unanswerable from Kentucky (lows ~50°F). Buying anyway as cheap insurance. Re-ask after the Appalachians trip. (stated 2026-09-27)"
- name: Therm-a-Rest MondoKing 3D, 25 in Large
  state: own
  note: R-7.0. Overkill for anything on the current list, which is the correct problem to have.
- name: 2-person tent
  state: own
- name: Puffy, hat, gloves
  state: own
  note: Lives in **Clothing — the layer system** below. Listed here too because the puffy is a sleep layer on any night the bag is marginal.
```

## Connectivity — the trip-critical one

A remote lecture runs 11:00–3:00 on a Wednesday of both 2026 trips, taken at camp.

```yaml
- name: Starlink
  state: own
  note: Needs sky view. Both Koomer Ridge and Davidson River are forested. **Test on arrival day, not the morning of the lecture.**
  question:
    text: Does it hold a usable link under canopy at Koomer Ridge, or does the lecture need a different plan?
    answeredBy: kentucky-2026
    answer: "Not at the tent site. It worked after moving to a better sky view elsewhere in the campground. Lesson: the arrival-day test is load-bearing, so do it at every forested site. (confirmed: kentucky-2026 log, 2026-09-27)"
- name: Portable power bank
  state: own
  note: Four hours of laptop plus Starlink is the real draw, not the phone.
- name: Offline maps — Google Maps regions
  state: need
  note: Downloaded before leaving home. Covers driving only.
- name: Offline maps — AllTrails or Gaia
  state: need
  note: "**Google Maps offline does not include trails.** Separate download, and a GPX for anything poorly blazed."
```

## Pack & hiking

```yaml
- name: Day pack
  state: own
- name: Trekking poles
  state: own
  note: The alternative to trusting muddy fixed ropes.
- name: Boots with real grip
  state: own
  note: Wet rock and wet rope are the recurring hazard.
- name: Headlamp + spare batteries
  state: own
  note: In the pack regardless of the hour.
- name: Camp shoes
  state: own
```

## Clothing — the layer system

The three layers that decide whether a cold, wet, exposed morning is fine or a bail-out. **Counts here are pack counts for a 5–10 night trip, not an inventory.** Confirmed Sept 2026 except the two still marked *unknown*: the **midlayer** and the **sun hat**.

```yaml
- name: Rain shell
  type: shell
  qty: 1
  state: own
  note: Confirmed Sept 2026. Guaranteed use at Hāna and Hosmer; the Mount Rogers ridge note calls shell and gloves not optional.
- name: Fleece or midlayer
  type: midlayer
  qty: 1
  state: unknown
  note: "The layer between the hiking shirt and the puffy — a fleece, grid fleece or light synthetic. Its job is to be worn *while moving* on a cold morning, which the puffy cannot do without soaking it in sweat. **Colin asked what this is in Sept 2026, which is itself the answer: there probably isn't one.** Confirm before the next cold trip."
- name: Puffy jacket
  type: insulation
  qty: 1
  state: own
  note: "Double duty: ridge layer and sleep layer. Hawksbill at 7:15 AM, 4,009 ft, mid-30s — and the Mount Rogers ridge, where the note says shell and gloves are not optional."
- name: Warm hat
  type: insulation
  qty: 1
  state: own
- name: Gloves
  type: insulation
  qty: 1
  state: own
  note: Confirmed Sept 2026. One pair — a wet pair with no spare is how a cold ridge morning ends early.
- name: Sun hat
  type: sun
  qty: 1
  state: unknown
  note: Not confirmed. Load-bearing on the desert trips, not the Appalachian ones.
- name: Sunglasses
  type: sun
  qty: 1
  state: unknown
```

## Clothing — worn articles & counts

Counts are transcribed from the Maui 2027 packing list, which is the only place any number was ever written down. They are a 7-day fly-in target — a 10-night drive-out trip with a laundromat mid-route wants different numbers. **No cotton on anything that gets sweat in it.**

```yaml
- name: Hiking shirts
  type: base
  qty: 2
  state: own
  note: Enough owned (confirmed Sept 2026). Pack count from the Maui list. Merino or synthetic — cotton holds water and stops insulating.
- name: Long pants
  type: legs
  qty: 1
  state: own
  note: Enough owned (confirmed Sept 2026). Brush, sun and cold mornings. Packing only one means one wet day ends the pants — consider two on any trip with a creek crossing.
- name: Shorts
  type: legs
  qty: 2
  state: own
  note: Enough owned (confirmed Sept 2026).
- name: Wool socks
  type: socks
  qty: 4
  state: own
  note: "“Plenty”, confirmed Sept 2026 — so the pack count is a choice, not a ceiling. Still the highest-leverage number here: wet feet on day three of eight is a whole-trip problem, not a day problem."
- name: Liner socks
  type: socks
  qty: null
  state: own
  note: Owned (confirmed Sept 2026); pack count never set. Blister insurance on the long descents.
- name: Underwear
  type: base
  qty: null
  state: own
  note: Owned (confirmed Sept 2026); pack count never set. Synthetic or merino, one per day unless there’s a laundry stop.
- name: Swim trunks
  type: water
  qty: 2
  state: own
  note: "\"One always wet\" — the Maui list's reasoning, and it applies to any swimming-hole trip."
- name: Sleep layer
  type: base
  qty: 1
  state: own
  note: Confirmed Sept 2026 — a dedicated dry set that never leaves the tent. Sleeping in the clothes you hiked in is how a 20°F bag underperforms.
```

## Camp kitchen

One burner, one pot, one pan. The meal plans are built to that exact constraint.

```yaml
- name: One burner, pot, pan, mug, spork
  state: own
- name: Wide-mouth thermos
  state: own
  note: "**One, and staying at one — decided Sept 2026.** Load-bearing: the standing routine is snack → hike → hot thermos meal at the turnaround → hike out. Because there is only one, hot oats and hot chocolate compete on any pre-dawn morning; the meal wins and the drink gets dropped. Plan around that rather than around a second flask. A second one would unlock the pre-dawn hot chocolate."
- name: 48 qt cooler
  state: own
  note: Frozen meals in flat quart bags *are* the ice. Holds ~2.5 days unaided in 75°F — buy a **block** of ice at resupply, not cubes.
  question:
    text: Does the frozen-meals-as-ice system actually reach the first resupply, and does the breakfast burrito survive to day 8?
    answeredBy: appalachians-2026
- name: Olive oil in a squeeze bottle
  state: own
  note: "One of the four things that turn a can into a meal: oil, hard cheese, crushed chips, starch pouch."
- name: Fuel canisters
  state: need
  note: Cannot fly. Buy on arrival on any fly-in trip.
```

## Vehicle & road

```yaml
- name: Spare, jack, tire plug kit
  state: need
  note: On maintained gravel the realistic failure mode is a cut sidewall, not getting stuck. Confirm the spare is actually inflated before FS 210.
- name: AAA membership
  state: own
  note: Waives the under-25 renter fee on fly-in trips. Verify it still applies at booking — this changes.
```

## Safety & documents

```yaml
- name: First aid kit
  state: own
- name: Printed permits + reservations
  state: need
  note: Paper copies. Some entrance stations require paper plus photo ID and have no signal to look you up.
- name: America the Beautiful pass
  state: own
  note: Covers NPS entry. Not state park fees, not timed entry.
```
