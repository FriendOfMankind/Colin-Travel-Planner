---
topic: food
summary: Allergy, spice ceiling, calorie target, what's never on the menu, and dishes already rejected.
source: Trees@c6e693c data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)
avoid:
  - what: Coffee
    terms: [ coffee ]
    allow: [ coffee house, coffee shop ]
    why: "PROFILE.food: no coffee. A named cafe as a destination is fine — ordering the coffee is not."
  - what: Beer
    terms: [ beer, brewpub ]
    why: "PROFILE.food: no beer. Breweries are also on the declined list."
dislikes:
  - what: Sausage gravy over biscuits
    terms: [ sausage gravy, biscuits and gravy ]
  - what: Grits, in any form
    terms: [ grits ]
  - what: Savoury rice porridge / congee
    terms: [ congee, rice porridge ]
  - what: Eggs poached in tomato sauce (shakshuka)
    terms: [ shakshuka ]
  - what: Eating a pouch straight as the meal
    terms: [ pouch plate, straight from the pouch ]
  - what: Bánh mì-style cold cut rolls
    terms: [ banh mi, bánh mì ]
  - what: Tuna or chicken salad
    terms: [ tuna salad, chicken salad ]
  - what: Cold leftover pizza as a lunch
    terms: [ cold pizza, leftover pizza ]
  - what: Hummus as a meal component
    terms: [ hummus ]
  - what: Egg salad
    terms: [ egg salad ]
  - what: Rice balls / onigiri
    terms: [ rice ball, onigiri ]
  - what: Ramen as a planned meal, loaded or upgraded (egg, sausage, pork). Plain cup ramen as trailhead fuel is fine; was "Ramen, both instant and upgraded" until 2026-09-27
    terms: [ loaded ramen, upgraded ramen, ramen with egg ]
  - what: Pork chop with cooked apple
    terms: [ pork chop ]
  - what: White chicken chili
    terms: [ white chicken chili, white chili ]
  - what: Gumbo
    terms: [ gumbo ]
  - what: Cheese grits in a boil bag
    terms: [ cheese grits ]
  - what: Refried beans
    terms: [ refried bean ]
  - what: Rice pudding
    terms: [ rice pudding ]
  - what: Griddled banana with chocolate
    terms: [ banana boat, griddled banana ]
---

# Food

Cooks at camp by default. **Oral allergy syndrome** — raw nuts, fruit and vegetables can irritate; cooked and roasted forms are the usual workaround, but which specific foods trigger it is not yet recorded. Restaurants are for high value, not convenience — a reputable place with a big menu is worth choosing from, a mediocre one is worth skipping entirely. Wants authentic local food and fresh dessert, bought rather than made. Spice **2–3 of 5** *(stated 2026-09-28; was 1–2)*: background heat, not the point of the dish. Target **~3,300 kcal/day** on a hiking trip (was ~3,000; raised 2026-09-28, see the macro table below). **No coffee, no beer.**

## Oral allergy syndrome: what's actually known

The paragraph above was written before any of this was confirmed. Current state:

- **Roasted nuts: fine. Confirmed.** Every nut in a recipe is a buying instruction (buy roasted), not a restriction. *(confirmed Sept 2026, source: Trees CLAUDE.md)*
- **Raw fruit: open.** Recipes that carry it are flagged `review: oas` in the kitchen and stay flagged until this is answered.
- **Dried fruit: open.** Same flag. Kentucky's plan carried figs (Day 4) and dried mango (Day 5), but **he didn't eat either**, so the retro couldn't answer it *(confirmed: kentucky-2026 log, 2026-09-27)*. October is planned without dried fruit, and the September crate's apricots and mango wait. Answering it needs a deliberate test: a small amount at home, not on a trail.
- **Cooked fruit: open, and possibly moot.** See the patterns section. Both cooked-fruit dishes on the Menu Bench were rejected.
- **Raw vegetables:** the profile says they "can irritate". No specific trigger is recorded. Kentucky's plan carried raw salsa and pepperoncini, but he didn't eat those either *(confirmed: kentucky-2026 log)*, so this is still open.

The camp kitchen (recipes, cooler doctrine, pantry) lives in `kitchen/`. This file is the person, not the menu.

## What actually works on the road (evidence)

From Kentucky 2026, where the detailed meal plan mostly didn't survive contact with the trip: *"I ended up going back to things I had in stock, staples."* *(confirmed: kentucky-2026 log, 2026-09-27)*

**Actually eaten, and liked:**
- **Breakfast:** oatmeal, every day, happily.
- **Lunch:** mac & cheese, bought grocery-store lunches (chicken tenders and similar), and twice **cup ramen at the trailhead with instant mashed potatoes stirred in** to soak up the water: "not very nutritious, but delicious and easy."
- **Dinner:** a boiled carb + canned/packaged meat + one canned extra. Specifically:
  - **Brami pasta + pasta sauce + meat mixed in** (chicken pouch or sausage). "Would happily eat it every night."
  - **Couscous + black beans:** liked.

**The cooler barely mattered.** The whole trip's cooler load was one pound of frozen ground beef (mixed into mac & cheese) and some vegetables. No rotisserie chicken, no freezer meals. A small cooler, or none, may be enough when the plan is trunk staples. *(confirmed: kentucky-2026 log)*

**Restaurants:** Miguel's Pizza (Slade KY), "very good." *(confirmed: kentucky-2026 log)*

**Tried, and didn't land:**
- Sun-dried tomatoes and chickpeas in the couscous: "not as much"
- Instant rice: "not as good as I was expecting"

**The formula he actually wants** *(stated 2026-09-27)*: a meal that's **mostly shelf-stable, lives in the car trunk for the whole trip, ideally bought in bulk**, plus one or two fresh or canned add-ons (a fresh protein, a vegetable, a can of something). **About 2 options per meal slot** is enough variety. The add-on is what keeps a repeated base interesting.

**Goal on a hiking day:** fuel + recover, meaning enough carbs to hike strong and solid protein to recover, at ~3,300 kcal (was ~3,000, raised 2026-09-28). *(stated 2026-09-27)*

**Working macro targets** (body weight ~185 lb / ~84 kg, *stated 2026-09-27*). These come from standard sports-nutrition ranges, not from a dietitian, so treat them as a starting point:

| | Per day | Basis |
|---|---|---|
| **Calories** | **~3,300** (was 3,000) | raised 2026-09-28: the staples menu lands at 3,150–3,500, and 3,000 was likely low for 185 lb on long days *(stated 2026-09-28)* |
| Protein | **~130–150 g** | ~1.6–1.8 g/kg, the recovery range for endurance days. Going over is harmless |
| Carbs | **~400–475 g** | ~5–5.5 g/kg, the fuel for long active days |
| Fat | **~70–95 g** | whatever's left of ~3,300 kcal |

A day of long miles at 185 lb likely burns more than 3,000 kcal. If he comes home lighter or runs out of steam on day 3+, raise the kcal target again. *(hypothesis, not yet observed)*

**Resolved 2026-09-27:** ramen was on the rejected list, yet he ate cup ramen twice on the trip. Both are true: the Menu Bench "no" votes were for loaded/upgraded ramen as a *meal*, and plain cup ramen is a quick trailhead fuel he likes. The rejected entry was narrowed to match.



Listed in frontmatter as `avoid`; the validator greps every itinerary for those terms.

Standing personal negatives — not activities considered and declined, but
things that are simply never right for this traveler. Same enforcement as
DECLINED: tools/validate.mjs greps a trip's schedule, reservations, hikes
and places for `terms` and reports a hit.

This exists because "No coffee, no beer" has been in PROFILE.food since the
file was written, and the Maui itinerary opened Day 3 with "Wake, coffee,
slow morning" the whole time. A preference stated only in prose is a
preference nothing checks.

## Dishes rejected on the Menu Bench

The list is `dislikes` in this file's frontmatter (one copy, so it can't drift from itself), enforced the same way as `avoid`.

## Patterns — hypotheses, NOT rules

The notes Trees kept above that list. Nothing enforces these, on purpose: acting on an unconfirmed pattern is how a preference list starts banning food nobody objected to.

Foods rejected on the Menu Bench, Sept 2026 — 20 of 88 candidates.
Enforced exactly like DECLINED and AVOID: tools/validate.mjs greps a trip's
meals for `terms` and reports a hit, so a rejected dish cannot quietly
reappear in an itinerary a year from now.

⚠️ These are the SPECIFIC dishes he said no to. The patterns underneath are
inference and are NOT enforced — they are written down as hypotheses to be
confirmed or knocked down, because acting on an unconfirmed pattern is how
a preference list starts banning food nobody objected to:
  - grits, congee and rice pudding all rejected → savoury or sweet porridge
    is out, even though oats are in. Oats may simply be the exception.
  - both ramen entries rejected → ramen is out as a format.
  - tuna salad, egg salad and bánh mì all rejected → possibly mayonnaise.
  - hummus, refried beans, white chicken chili and gumbo rejected → possibly
    beans as the centre of a dish. Note lentil stew and cannellini pasta
    were both YES, so it is not legumes in general.
  - cold pizza, rice balls and egg salad rejected → leftovers repurposed as
    a cold lunch may be the objection, not the food.
  - pork chop with apple AND griddled banana both rejected → <b>cooked fruit
    may be out too</b>, which matters: cooked fruit was the proposed
    workaround for the raw-fruit allergy. If both are out, fruit leaves the
    plan entirely and the two raw apples need a non-fruit replacement.
