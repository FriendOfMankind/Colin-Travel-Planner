/* import-me.mjs — Trees data/profile.js → me/*.md, one topic per file.

   A lot of what Trees knew about Colin lived in *comments* above the
   constants (the food-pattern hypotheses, the live stargazing conflict), where
   no tool and no AI query would ever see it. Those comments come across as
   prose, because in this repo prose is where judgment lives. */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { htmlToMd, htmlToMdInline } from "./md.mjs";
import { TREES } from "./trees.mjs";
import { toYaml } from "./format.mjs";

const Y = toYaml;
const block = (v) => ["```yaml", Y(v), "```"].join("\n");

/** The /* … *\/ comment immediately above `const NAME`, de-indented. */
function commentAbove(src, name) {
  const at = src.indexOf(`const ${name}`);
  const before = src.slice(0, at).trimEnd();
  if (!before.endsWith("*/")) return "";
  const start = before.lastIndexOf("/*");
  return before.slice(start + 2, -2)
    .replace(/^[=\s]*\n/, "").replace(/\n[=\s]*$/, "")
    .split("\n").map((l) => l.replace(/^ {0,3}/, "")).join("\n").trim();
}
const md = (v) => (typeof v === "string" ? htmlToMdInline(v) : v);
const deep = (v) =>
  typeof v === "string" ? htmlToMdInline(v)
    : Array.isArray(v) ? v.map(deep)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]))
    : v;

export function importMe({ hub, write, root, force, commit }) {
  const src = readFileSync(join(TREES, "data/profile.js"), "utf8");
  const P = hub.read("PROFILE");
  const provenance = `Trees@${commit} data/profile.js (rebuilt there 2026-09-04 from the Sept 2026 handoff, the 2026 MASTER trip files, the MEALS files and the Sept 3 2026 bucket list)`;
  const fm = (topic, summary, extra = {}) =>
    ["---", Y({ topic, summary, source: provenance, ...extra }), "---", ""].join("\n");

  const files = {
    "me/profile.md": [
      fm("profile", "Who, from where, in what car. The facts every plan starts from."),
      "# Profile", "",
      `- **Name:** ${P.name}`,
      `- **Home base:** ${md(P.homeBase)}`,
      `- **Group:** ${md(P.defaultGroup)}`,
      `- **Trip shape:** ${md(P.tripShape)}`, "",
      "## Vehicle", "", htmlToMd(P.vehicle), "",
      "## Renting a car", "", htmlToMd(P.driverNote), "",
      "## Related", "",
      "- How hard, how far: [hiking.md](hiking.md)",
      "- What to eat: [food.md](food.md)",
      "- The rules every itinerary is built to: [principles.md](principles.md)", "",
    ],

    "me/hiking.md": [
      fm("hiking", "Distance and gain ceiling, appetite for difficulty, crowds."),
      "# Hiking", "",
      "## Daily ceiling", "", htmlToMd(P.ceiling), "",
      "## Difficulty", "", htmlToMd(P.difficulty), "",
      "## Crowds", "", htmlToMd(P.crowds), "",
    ],

    "me/food.md": [
      fm("food", "Allergy, spice ceiling, calorie target, what's never on the menu, and dishes already rejected.",
        {
          avoid: hub.read("AVOID").map((a) => ({ what: a.what, terms: a.terms, ...(a.allow ? { allow: a.allow } : {}), why: md(a.why) })),
          dislikes: hub.read("DISLIKES").map((d) => ({ what: d.what, terms: d.terms })),
        }),
      "# Food", "",
      htmlToMd(P.food), "",
      "The camp kitchen (recipes, cooler doctrine, pantry) lives in `kitchen/`. This file is the person, not the menu.", "",
      "## Never — coffee and beer", "",
      "Listed in frontmatter as `avoid`; the validator greps every itinerary for those terms.", "",
      commentAbove(src, "AVOID"), "",
      "## Dishes rejected on the Menu Bench", "",
      "The list is `dislikes` in this file's frontmatter (one copy, so it can't drift from itself), enforced the same way as `avoid`.", "",
      "## Patterns — hypotheses, NOT rules", "",
      "The notes Trees kept above that list. Nothing enforces these, on purpose: acting on an unconfirmed pattern is how a preference list starts banning food nobody objected to.", "",
      commentAbove(src, "DISLIKES"), "",
    ],

    "me/principles.md": [
      fm("principles", "The locked rule set every itinerary is built to. Breaking one needs a written reason."),
      "# Principles", "",
      commentAbove(src, "PRINCIPLES"), "",
      ...hub.read("PRINCIPLES").map((p, i) => `${i + 1}. ${htmlToMdInline(p)}`), "",
    ],

    "me/declined.md": [
      fm("declined", "Activities considered and declined. Re-proposing these wastes his time.",
        { declined: hub.read("DECLINED").map((d) => ({ what: d.what, terms: d.terms, ...(d.allow ? { allow: d.allow } : {}) })) }),
      "# Declined", "",
      "The list is `declined` in this file's frontmatter. `terms` are what the validator greps itineraries for; `allow` are phrases that contain a term but are fine.", "",
      commentAbove(src, "DECLINED"), "",
    ],

    "me/working-rules.md": [
      fm("working-rules", "How Claude should behave when working with Colin."),
      "# Working rules", "",
      ...hub.read("WORKING_RULES").map((r) => `- ${htmlToMdInline(r)}`), "",
    ],

    "me/gear.md": [
      fm("gear", "What's in the kit, its state (own/need/replace/rent/unknown), and the questions only a trip can answer."),
      "# Gear locker", "",
      commentAbove(src, "PROFILE").split("\n").filter((l, i, a) => a.slice(0, i + 1).some((x) => /Gear `state`/.test(x))).join("\n"), "",
      ...hub.read("GEAR").flatMap((c) => [
        `## ${c.category}`, "",
        ...(c.note ? [htmlToMd(c.note), ""] : []),
        block(deep(c.items).map((it) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== "")))), "",
      ]),
    ],

    "me/checklist.md": [
      fm("checklist", "Runs on every trip, whatever the destination."),
      "# Universal checklist", "",
      ...hub.read("UNIVERSAL_CHECKLIST").map((c) => `- [ ] ${htmlToMdInline(c)}`), "",
    ],

    "me/booking.md": [
      fm("booking", "When each reservation system opens. The Agenda derives real dates from these; never hand-compute one."),
      "# Booking windows", "",
      commentAbove(src, "BOOKING_WINDOWS"), "",
      block(deep(hub.read("BOOKING_WINDOWS"))), "",
    ],

    "me/calendar.md": [
      fm("calendar", "Term dates, blocked dates and the horizon. Free windows are computed from this, never listed by hand."),
      "# Calendar", "",
      commentAbove(src, "AVAILABILITY"), "",
      block(deep(hub.read("AVAILABILITY"))), "",
    ],
  };

  for (const [rel, lines] of Object.entries(files)) {
    if (existsSync(join(root, rel)) && !force) {
      console.log(`  kept ${rel} (exists; --force to overwrite a curated file)`);
      continue;
    }
    write(rel, lines.join("\n").replace(/\n{3,}/g, "\n\n"));
  }
}
