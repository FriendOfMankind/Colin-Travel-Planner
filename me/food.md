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
  - what: Ramen, both instant and upgraded
    terms: [ ramen ]
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

Cooks at camp by default. **Oral allergy syndrome** — raw nuts, fruit and vegetables can irritate; cooked and roasted forms are the usual workaround, but which specific foods trigger it is not yet recorded. Restaurants are for high value, not convenience — a reputable place with a big menu is worth choosing from, a mediocre one is worth skipping entirely. Wants authentic local food and fresh dessert, bought rather than made. Spice **1–2 of 5**: background heat, not the point of the dish. Target **~3,000 kcal/day** on a hiking trip, confirmed. **No coffee, no beer.**

## Oral allergy syndrome: what's actually known

The paragraph above was written before any of this was confirmed. Current state:

- **Roasted nuts: fine. Confirmed.** Every nut in a recipe is a buying instruction (buy roasted), not a restriction. *(confirmed Sept 2026, source: Trees CLAUDE.md)*
- **Raw fruit: open.** Recipes that carry it are flagged `review: oas` in the kitchen and stay flagged until this is answered.
- **Dried fruit: open.** Same flag. Kentucky's Day 4 lunch carried figs and Day 5 carried dried mango, so **the Kentucky retro can answer this.**
- **Cooked fruit: open, and possibly moot.** See the patterns section. Both cooked-fruit dishes on the Menu Bench were rejected.
- **Raw vegetables:** the profile says they "can irritate". No specific trigger is recorded. Kentucky carried raw salsa and pepperoncini, so the retro can ask about those.

The camp kitchen (recipes, cooler doctrine, pantry) lives in `kitchen/`. This file is the person, not the menu.

## Never — coffee and beer

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
