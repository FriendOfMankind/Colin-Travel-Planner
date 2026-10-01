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

Rebuilt for cold in 2026. This was the weak link and no longer is. The liner is owned (2026-09-28); the open item is whether bag + liner is warm enough at 32°F, which October answers.

```yaml
- name: REI Co-op Siesta 20 sleeping bag
  state: own
  note: New, Sept 2026. First cold-weather bag. Sept KY is the shakedown for the October 30s.
  question:
    text: Does it actually sleep warm enough to trust at 32°F?
    answeredBy: kentucky-2026
    answer: "Partly. Warm with no issues at ~50°F. The 32°F half is still untested; Kentucky never got that cold. (confirmed: kentucky-2026 log, 2026-09-27)"
- name: Sleeping bag liner
  state: own
  note: "Ordered/owned as of 2026-09-28 (was: need). For the last three October nights (Linville and Hurricane, mid-30s). **Decided 2026-09-27: buying one**, as margin, because Kentucky could not test the bag near freezing."
  question:
    text: Is it needed, or does the Siesta 20 cover the mid-30s on its own?
    answeredBy: kentucky-2026
    answer: "Unanswerable from Kentucky (lows ~50°F). Buying anyway as cheap insurance. Re-ask after the Appalachians trip. (stated 2026-09-27)"
- name: Therm-a-Rest MondoKing 3D, 25 in Large
  state: own
  note: R-7.0. Overkill for anything on the current list, which is the correct problem to have.
- name: Naturehike Mongar 2 tent
  state: own
  note: "2-person ultralight backpacking tent. *(stated 2026-10-01; source: naturehike.com/products/mongar-2-person-ultralight-backpacking-tent)* (was: model not recorded)"
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
- name: Salomon ADV Skin 12 (hydration vest)
  state: own
  note: "*(stated 2026-10-01)* Day-hiking vest. Unconfirmed whether it *is* the Day pack above or a second pack. **Care:** air it out after every hike with the flasks out and the pockets open. Rinse in lukewarm water after sweaty days, and rinse the zippers too, because salt is what kills them. Hand-wash with non-detergent soap when it stinks. A low-temperature machine wash is OK occasionally, not regularly. Don't tumble-dry. Store it dry with the zippers closed, out of the sun. *(source: salomon.com, How to Clean Your Hydration Pack, 2026-10-01)*"
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
- name: Hybrid bike
  state: own
  note: "Owned; Colin calls it a mountain bike, and it's a hybrid. *(stated 2026-09-30)* Right tool for rail trails and gravel, not for technical singletrack. See the scenic rides in [bucket.yaml](../bucket.yaml)."
- name: Trunk bike rack
  state: own
  note: "*(stated 2026-09-30)* On a sedan it sits across the trunk lid, and the trunk is where camp lives. Worth checking before the first bike trip: can the trunk open with the rack on, or does the bike come off every time?"
- name: Bike helmet
  state: need
  note: "*(stated 2026-09-30)*"
- name: Bike lock
  state: need
  note: "*(stated 2026-09-30)* For the bike at camp overnight and at trailheads."
- name: Flat kit (spare tube, tire levers, pump)
  state: need
  note: "*(stated 2026-09-30)*"
- name: Bike light, 300–400 lumen handlebar
  state: need
  note: "*(stated 2026-09-30)* The Hiawatha requires one for its tunnels *(source: ridethehiawatha.com FAQ, search snippet, 2026-09-30)*. A headlamp isn't enough for a 1.66 mi tunnel."
- name: Packraft
  state: rent
  note: "Only if a trip needs it: rent it or decide per trip, not a purchase. Outfitter floats and guided rafts cover most rivers. *(stated 2026-09-28)* See [adventures.md](adventures.md)."
- name: Snorkel, mask and fins
  state: own
  note: "*(stated 2026-10-01)* Owned, so a snorkel charter only needs the boat. Maui's packing list already has them going in checked luggage."
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

## Water

Smartwater 1 L bottles are the storage system: portable, and they stack in the trunk. *(stated 2026-10-01)*

```yaml
- name: Smartwater 1 L bottles
  state: own
  note: "*(stated 2026-10-01)* The everyday water storage, carried and stacked by the dozen."
- name: Water filter (current)
  state: own
  note: "*(stated 2026-10-01)* Owned, but it doesn't attach to a bottle. Model not recorded."
- name: Sawyer Squeeze
  state: need
  note: "*(stated 2026-10-01, wants one)* Users report it threads onto Smartwater bottles *(source: thruhiker Facebook group, search snippet, 2026-10-01)*. Hand-tighten only, because over-tightening damages the gasket *(source: sawyer.com/faqs, search snippet, 2026-10-01)*. **Never let it freeze:** Sawyer won't say freezing is safe and there's no test for damage, so a frozen filter means a new one *(source: backpackinglight.com forum quoting Sawyer, search snippet, 2026-10-01)*. On nights near 32°F it sleeps in the bag, not in the car."
- name: Water jugs
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)* Linville needs ~12 L and Sky Islands 5+ gallons of capacity beyond the bottles (see those trips)."
```

## Camp kitchen

One burner, one pot, one pan. The meal plans are built to that exact constraint.

**History:** on Sept 14 2026 Colin said most of this category was *not* owned; it had been marked `own` since the file was written, copied from a packing list. That correction sat unmerged on a Trees branch and never reached this file. **Re-confirmed item by item on 2026-09-28**, below.

```yaml
- name: One burner
  state: own
  note: "*(confirmed Sept 16 2026)* Confirm it takes screw-on isobutane before buying canisters."
- name: 2L pot with lid
  state: own
  note: "*(confirmed 2026-09-28)*"
- name: 8–10 in pan
  state: own
  note: "*(confirmed 2026-09-28)*"
- name: Insulated mug + spork
  state: own
  note: "*(confirmed 2026-09-28)*"
- name: Folding knife
  state: own
  note: "*(confirmed 2026-09-28)*"
- name: Wide-mouth thermos
  state: own
  note: "*(confirmed owned 2026-09-28; how many not recorded.)* **One, and staying at one — decided Sept 2026.** Load-bearing: the standing routine is snack → hike → hot thermos meal at the turnaround → hike out. Because there is only one, hot oats and hot chocolate compete on any pre-dawn morning; the meal wins and the drink gets dropped. Plan around that rather than around a second flask. A second one would unlock the pre-dawn hot chocolate."
- name: Cooler
  state: own
  note: "*(confirmed owned 2026-09-28; size not recorded. This entry used to say 48 qt, which was never confirmed.)* Frozen meals in flat quart bags *are* the ice. Buy a **block** of ice at resupply, not cubes."
  question:
    text: Does the frozen-meals-as-ice system actually reach the first resupply, and does the breakfast burrito survive to day 8?
    answeredBy: appalachians-2026
    answer: "Moot (2026-09-28). October no longer carries freezer meals or the burrito; the staples menu replaced them after Kentucky's cooler held only a pound of beef. The real question now is whether a small cooler of eggs, cheese and frozen veg is all a trip needs."
- name: Olive oil in a squeeze bottle
  state: own
  note: "One of the four things that turn a can into a meal: oil, hard cheese, crushed chips, starch pouch."
- name: Fuel canisters
  state: need
  note: "Cannot fly. Buy on arrival on any fly-in trip. On a drive-out trip they're just shopping: October budgets **3 for eleven days**, the only per-day figure ever written down. Confirm the burner takes screw-on isobutane before buying."
- name: Long-handled spoon
  state: need
  note: "**Not owned** *(2026-09-28)*. **Buy before Oct 15:** the Oct 23 power-oats bag and thermos meals are eaten from deep containers."
- name: Thin silicone spatula
  state: need
  note: "**Not owned** *(2026-09-28)*. Buy before Oct 15: the potato scramble (3 mornings) and the lecture-day quesadillas need one; a spork fails on eggs."
- name: Wash basin, sponge, biodegradable soap
  state: unknown
  note: "Every draining or high-cleanup meal assumes these exist. Never confirmed owned."
- name: Bandanas ×2
  state: unknown
  note: "One pot wipe, one towel. Never confirmed owned."
```

## Camp comfort & night

```yaml
- name: Camp chair
  state: need
  note: "*(stated 2026-10-01)* Buy-once, collapsible; weight doesn't matter, it comes out of the trunk. Lead candidate: Kermit Chair Classic, 5.5 lb, packs to 22–24 × 6 in, 5-year warranty and replacement parts for life, handmade in the USA *(source: kermitchair.com, search snippet, 2026-10-01)*. Price TBD."
- name: Big flashlight (1,000+ lumen, rechargeable)
  state: need
  note: "*(stated 2026-10-01, wants one)* For night exploring (Blevins farm). Candidates: Fenix PD36R Pro *(source: gearjunkie.com best flashlights 2026, search snippet, 2026-10-01)*; Sofirn SC33 or Wurkkos TS22 *(source: reddit r/flashlight, search snippet, 2026-10-01)*. Specs and prices not checked. ⚠️ Recalled, not verified: spare lithium batteries fly in carry-on only."
- name: Lantern
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)*"
- name: Shower towel
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)*"
- name: Binoculars
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)*"
- name: Phone tripod + remote
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)*"
- name: Camp pillow
  state: own
  note: "*(stated 2026-10-01: \"pretty much own everything else\", answering a list of chair, lantern, jugs, filter, bottles, towel, binoculars, phone tripod and pillow; confirm at the next packing)*"
```

## Vehicle & road

```yaml
- name: Spare, jack, tire plug kit
  state: need
  note: On maintained gravel the realistic failure mode is a cut sidewall, not getting stuck. Confirm the spare is actually inflated before FS 210.
- name: 12V tire inflator
  state: own
  note: "*(stated 2026-10-01)* What makes the plug kit useful: plug, then reinflate on the spot."
- name: AAA membership
  state: own
  note: Waives the under-25 renter fee on fly-in trips. Verify it still applies at booking — this changes.
```

## Safety & documents

**Satellite messenger: not owned, and not wanted** *(stated 2026-10-01)*. Don't propose buying one. The phone is the satellite baseline instead (below). ⚠️ `trips/maui-2027/trip.md` still plans a rental for the no-signal Piʻilani stretch; whether the phone covers Hawaii decides that, and it's unchecked.

```yaml
- name: iPhone 16 Plus
  state: own
  note: "*(stated 2026-10-01)* The off-grid lifeline. Apple's satellite features (Emergency SOS, Messages, Find My and Roadside Assistance via satellite) cover iPhone 14 and later, and free access was extended for the 14, 15 and 16 *(source: macrumors.com, 2026-09-09, search snippet read 2026-10-01)*. Works only with no cell or Wi-Fi and a clear view of the sky *(source: support.apple.com/en-us/101573, search snippet, 2026-10-01)*. ⚠️ Untested by Colin: run the demo (Settings → Emergency SOS) at home, then in a gorge. When the free period ends: not recorded."
- name: First aid kit
  state: own
- name: Printed permits + reservations
  state: need
  note: Paper copies. Some entrance stations require paper plus photo ID and have no signal to look you up.
- name: America the Beautiful pass
  state: own
  note: Covers NPS entry. Not state park fees, not timed entry.
```
