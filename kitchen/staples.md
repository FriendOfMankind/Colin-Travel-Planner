---
topic: staples
summary: "The trunk-staple menu: one-pot, eyeball-the-water meals rebuilt to be more nutritious, with macros computed against the targets. Two options per meal slot."
targets:
  kcal: 3000
  protein_g: [130, 150]
  carbs_g: [400, 450]
  fat_g: [70, 85]
---

# Staples

How Colin actually eats on the road (`me/food.md`, Kentucky log): a **shelf-stable base that lives in the trunk**, plus one or two fresh or canned add-ons, **about 2 options per meal slot**. This file upgrades those staples to be more nutritious, without giving up what makes them work:

- **One pot, one flame.** Water and ingredients go in the pot.
- **No measuring water.** Every meal here is forgiving: pasta gets drained; couscous, oats and potato flakes get stirred until they look right, with a splash more water if they're too thick or a longer simmer if they're too thin.
- **Buy in bulk, keep in the car.** Fresh add-ons are optional upgrades, never load-bearing.

**Where the numbers come from.** Brami and the Quaker packet are from label photos (`basis: label`). Everything else is an **estimate** from typical US nutrition labels for that kind of product (`basis: estimate`): expect ±15% by brand. Totals are computed by `node tools/macros.mjs`, never added by hand. **Constraints respected:** OAS (fruit and veg are all cooked here; roasted nuts are fine), spice ≤ 2/5 (mild taco seasoning only), and nothing from the rejected list. The ramen bomb stays plain, because loaded ramen was voted down, so its protein sits on the side.

## What changed from what you ate in Kentucky

| Was | Now | Why |
|---|---|---|
| Maple & brown sugar packets | **Plain quick oats + whole milk powder + whey + peanut butter** | 3 packets gave 12 g protein and 36 g added sugar. This gives ~55 g protein, and you choose the sweetness |
| Plain mashed-potato flakes | Flakes + milk powder + eggs + cheddar + real bacon bits | Same texture, now a real breakfast |
| Cup ramen at the trailhead | **Ramen block** (half the seasoning) + extra potato flakes, with **2 oz jerky on the side** | Keeps the thing you like, adds ~20 g protein without "loading" the noodles. Jerky over summer sausage because the sausage tipped the day's fat way over |
| Couscous + chickpeas + sun-dried tomato | **Couscous + black beans + cheddar + chicken + mild taco seasoning** | Keeps the parts you liked, drops the ones you didn't |
| Brami + sauce + meat | Same, plus **broccoli dropped into the pasta water** for the last 3 min | Already the best meal in the rotation. One vegetable, zero extra dishes |
| Boxed mac & cheese | **Cheeseburger mac:** Brami + milk powder + real cheddar + butter + ground beef + peas | Double the protein of a box, no orange powder |

## The menu: two per slot

**Breakfast**
- **B1 · Power oats.** Boil some water. Dump in the oats and stir until it's as thick as you like it (thin it with a splash of water, thicken it by cooking longer). Take it off the heat, then stir in milk powder, whey and PB, and sweeten with brown sugar to taste. *(Whey clumps if it's boiled, so always stir it in off the heat.)* Works in the thermos too.
- **B2 · Loaded potato scramble.** Boil a mug or two of water in the pot. Stir in potato flakes until it's thick, then milk powder and butter. Crack in 2 eggs over low heat and keep stirring until they set. Finish with cheddar and bacon bits.

**Lunch** *(the trailhead meal)*
- **L1 · Ramen bomb + jerky.** Boil water, add the ramen block with half the seasoning, and stir in potato flakes until it's thick. Eat the jerky alongside.
- **L2 · Couscous + black beans.** Heat the drained beans and taco seasoning in some water, kill the heat, dump in the couscous and cover for 5 min. Too wet: simmer a minute. Too dry: splash of water. Stir in the chicken, cheddar and olive oil. Works in the thermos.

**Dinner**
- **D1 · Brami + sauce + chicken.** Boil a pot of water, cook the pasta, and add frozen broccoli for the last 3 minutes. Drain. Stir in marinara and 2 chicken pouches, warm through, and top with parmesan. *Fresh upgrade:* brown 4 oz ground beef in the pot first and set it aside on the lid, then use it in place of the chicken.
- **D2 · Cheeseburger mac.** Brown 4 oz ground beef in the pot. Add water and pasta and boil, adding the peas for the last 3 min. Pour off most of the water, leaving a splash. Stir in milk powder and cheddar until it's creamy. (No butter needed: the beef brings the fat.)

**Trail snacks:** a handful of trail mix, a bar, and a couple of ounces of pretzels. The pretzels are cheap, salty carbs, which the rest of the menu is short on.

## Foods

Per serving. `basis: label` came from a photo; `basis: estimate` is typical-label data, not your exact brand. When you photograph a label, replace the estimate and change the basis.

```yaml foods
- { id: brami,        name: Brami lupini pasta, serving: 2 oz (56 g) dry, kcal: 200, protein_g: 12, carbs_g: 36, fat_g: 2, basis: label }
- { id: quaker_maple, name: Quaker instant oatmeal maple & brown sugar, serving: 1 packet (43 g), kcal: 160, protein_g: 4, carbs_g: 33, fat_g: 2, basis: label }
- { id: oats,         name: Plain quick or rolled oats, serving: 50 g dry (~2/3 cup), kcal: 190, protein_g: 6.5, carbs_g: 34, fat_g: 3.5, basis: estimate }
- { id: milk_powder,  name: Whole milk powder (e.g. Nido), serving: 30 g (~1/4 cup), kcal: 150, protein_g: 8, carbs_g: 11, fat_g: 8, basis: estimate }
- { id: whey,         name: Whey protein, unflavored or vanilla, serving: 1 scoop (30 g), kcal: 120, protein_g: 24, carbs_g: 3, fat_g: 1.5, basis: estimate }
- { id: pb,           name: Peanut butter, serving: 2 tbsp (32 g), kcal: 190, protein_g: 7, carbs_g: 7, fat_g: 16, basis: estimate }
- { id: nuts,         name: Roasted almonds or walnuts, serving: 1 oz (28 g), kcal: 165, protein_g: 6, carbs_g: 6, fat_g: 14, basis: estimate }
- { id: brown_sugar,  name: Brown sugar, serving: 1 tbsp (12 g), kcal: 45, protein_g: 0, carbs_g: 12, fat_g: 0, basis: estimate }
- { id: potato_flakes, name: Plain instant potato flakes, serving: 30 g (~1/2 cup), kcal: 105, protein_g: 2.5, carbs_g: 24, fat_g: 0, basis: estimate }
- { id: bacon_bits,   name: Real bacon bits (shelf-stable), serving: 1 tbsp (7 g), kcal: 25, protein_g: 3, carbs_g: 0, fat_g: 1.5, basis: estimate }
- { id: egg,          name: Egg, large (fresh add-on), serving: 1 egg, kcal: 72, protein_g: 6.3, carbs_g: 0.4, fat_g: 4.8, basis: estimate }
- { id: cheddar,      name: Cheddar or other hard cheese, serving: 1 oz (28 g), kcal: 115, protein_g: 7, carbs_g: 0.4, fat_g: 9.5, basis: estimate }
- { id: parmesan,     name: Parmesan, grated, serving: 10 g (~2 tbsp), kcal: 42, protein_g: 3.8, carbs_g: 0.4, fat_g: 2.8, basis: estimate }
- { id: olive_oil,    name: Olive oil, serving: 1 tbsp, kcal: 120, protein_g: 0, carbs_g: 0, fat_g: 14, basis: estimate }
- { id: butter,       name: Butter, serving: 1 tbsp, kcal: 100, protein_g: 0, carbs_g: 0, fat_g: 11, basis: estimate }
- { id: ramen,        name: Instant ramen block, half the seasoning, serving: 1 block (~85 g), kcal: 380, protein_g: 9, carbs_g: 52, fat_g: 14, basis: estimate }
- { id: couscous,     name: Couscous, serving: 50 g dry (~1/4 cup), kcal: 180, protein_g: 6.4, carbs_g: 36, fat_g: 0.3, basis: estimate }
- { id: black_beans,  name: Black beans, canned, drained, serving: 1/2 cup (~1/3 can), kcal: 110, protein_g: 7, carbs_g: 20, fat_g: 0.5, basis: estimate }
- { id: taco_mild,    name: Mild taco seasoning, serving: 1 tbsp, kcal: 20, protein_g: 0.5, carbs_g: 4, fat_g: 0.3, basis: estimate }
- { id: chicken_pouch, name: Chicken, pouch or can, serving: 1 pouch (~2.5 oz), kcal: 80, protein_g: 15, carbs_g: 0, fat_g: 2, basis: estimate }
- { id: summer_sausage, name: Summer sausage (shelf-stable), serving: 2 oz (56 g), kcal: 180, protein_g: 8, carbs_g: 1, fat_g: 16, basis: estimate }
- { id: ground_beef,  name: Ground beef 85/15 (fresh add-on), serving: 4 oz raw, kcal: 240, protein_g: 21, carbs_g: 0, fat_g: 17, basis: estimate }
- { id: marinara,     name: Jarred marinara, serving: 1/2 cup, kcal: 70, protein_g: 2, carbs_g: 10, fat_g: 2.5, basis: estimate }
- { id: broccoli,     name: Frozen broccoli (add-on), serving: 1 cup, kcal: 25, protein_g: 2.5, carbs_g: 4, fat_g: 0.3, basis: estimate }
- { id: peas,         name: Frozen peas (add-on), serving: 1/2 cup, kcal: 60, protein_g: 4, carbs_g: 10, fat_g: 0.3, basis: estimate }
- { id: jerky,        name: Beef jerky, serving: 1 oz (28 g), kcal: 80, protein_g: 11, carbs_g: 6, fat_g: 1, basis: estimate }
- { id: pretzels,     name: Pretzels, serving: 1 oz (28 g), kcal: 110, protein_g: 3, carbs_g: 23, fat_g: 1, basis: estimate }
- { id: trail_mix,    name: Trail mix with roasted nuts, serving: 1/4 cup (40 g), kcal: 190, protein_g: 5, carbs_g: 18, fat_g: 12, basis: estimate }
- { id: bar,          name: Energy bar (Clif-type), serving: 1 bar (68 g), kcal: 250, protein_g: 10, carbs_g: 44, fat_g: 5, basis: estimate }
```

## Meals

Quantities are in *servings* of each food above.

```yaml meals
- id: B1
  name: Power oats
  items: { oats: 2.5, milk_powder: 1, whey: 1, pb: 1, brown_sugar: 1 }
- id: B2
  name: Loaded potato scramble
  items: { potato_flakes: 3, milk_powder: 1, butter: 0.5, egg: 2, cheddar: 1, bacon_bits: 2 }
- id: L1
  name: Ramen bomb + jerky on the side
  items: { ramen: 1, potato_flakes: 2, jerky: 2 }
- id: L2
  name: Couscous + black beans + chicken
  items: { couscous: 2.5, black_beans: 2, taco_mild: 1, chicken_pouch: 1, cheddar: 1, olive_oil: 0.5 }
- id: D1
  name: Brami + marinara + chicken + broccoli
  items: { brami: 2.5, marinara: 2, chicken_pouch: 2, parmesan: 1, broccoli: 1, olive_oil: 0.5 }
- id: D2
  name: Cheeseburger mac
  items: { brami: 2.5, milk_powder: 1, cheddar: 1.5, ground_beef: 1, peas: 1 }
- id: S
  name: Trail snacks (a handful of trail mix, a bar, 2 oz pretzels)
  items: { trail_mix: 1, bar: 1, pretzels: 2 }
- id: OLD-B
  name: "For comparison: 3 Quaker maple packets"
  items: { quaker_maple: 3 }
```

## Totals

```yaml days
- { name: "Day A: B1 · L2 · D1 · snacks", meals: [B1, L2, D1, S] }
- { name: "Day B: B2 · L1 · D2 · snacks", meals: [B2, L1, D2, S] }
- { name: "Day C: B1 · L1 · D2 · snacks", meals: [B1, L1, D2, S] }
```

<!-- GENERATED by tools/macros.mjs — do not edit by hand -->

**Per meal** (≈ means at least one ingredient is an estimate)

| Meal | kcal | Protein g | Carbs g | Fat g |
|---|---|---|---|---|
| ≈ B1 · Power oats | 980 | 55 | 118 | 34 |
| ≈ B2 · Loaded potato scramble | 824 | 41 | 84 | 36 |
| ≈ L1 · Ramen bomb + jerky on the side | 750 | 36 | 112 | 16 |
| ≈ L2 · Couscous + black beans + chicken | 945 | 53 | 134 | 21 |
| ≈ D1 · Brami + marinara + chicken + broccoli | 927 | 70 | 114 | 24 |
| ≈ D2 · Cheeseburger mac | 1123 | 74 | 112 | 45 |
| ≈ S · Trail snacks (a handful of trail mix, a bar, 2 oz pretzels) | 660 | 21 | 108 | 19 |
| OLD-B · For comparison: 3 Quaker maple packets | 480 | 12 | 99 | 6 |

**Per day**, against the targets in `me/food.md` (3000 kcal · 130–150 g protein · 400–450 g carbs · 70–85 g fat)

| Day | kcal | Protein g | Carbs g | Fat g | vs target |
|---|---|---|---|---|---|
| Day A: B1 · L2 · D1 · snacks | 3512 | 199 | 475 | 98 | protein +49, carbs +25, fat +13 |
| Day B: B2 · L1 · D2 · snacks | 3357 | 172 | 416 | 115 | protein +22, fat +30 |
| Day C: B1 · L1 · D2 · snacks | 3513 | 186 | 450 | 114 | protein +36, fat +29 |

<!-- /GENERATED -->

## Shopping list: bulk, lives in the trunk

Oats (big canister) · whole milk powder · whey · peanut butter · brown sugar · plain potato flakes · real bacon bits · ramen blocks · couscous · black beans (pull-tab cans) · mild taco seasoning · chicken pouches or cans · beef jerky · pretzels · Brami (or another bean/lentil pasta) · jarred marinara · parmesan · olive oil (squeeze bottle) · trail mix · bars.

**Fresh add-ons (cooler, optional):** eggs, cheddar, butter, ground beef, frozen broccoli and peas. The frozen veg doubles as ice for the first day or two.
