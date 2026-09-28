# Trail Notes, rebuilt: Colin's travel brain

This repo *is* the assistant's memory. Colin asks questions and makes changes from the Claude app; a website renders the same files for glancing at in the field. There's no database and no hidden state: if it isn't in a file here, it isn't known.

**Status: Phase 1 prototype** (plan: see "Where this is going" below). Only `kentucky-2026` and `me/` have been migrated. The other five trips and the 33 wishlist entries still live in the old repo, `FriendOfMankind/Trees`, which is the live copy until cutover.

## Start every question here

1. **Read `INDEX.md` first.** It's generated, and it lists every file with a one-line summary and status. Then open only what the question needs.
2. **Where answers live:**
   - Preferences, constraints, gear, calendar: `me/*.md` (one topic per file)
   - A trip's plan: `trips/<slug>/trip.md`
   - Where a place is: `trips/<slug>/places.yaml`
   - **What actually happened / past experience: `trips/<slug>/log.md`**
3. **Cite the file** you got an answer from. On a phone that's how Colin knows whether you read it or remembered it.
4. **Say which kind of fact it is:** verified (has a source), recalled (from Colin's memory), planned (a decision, not an observation) or unknown. "Not recorded" is a correct and useful answer. A confident guess is not.
5. If two files disagree, **say so and name both.** Don't silently pick one; contradictions are the most valuable thing you can surface.

## Making changes

- **Content changes are file changes.** Edit the md/yaml, run the checks, commit and push. Never hand-edit `INDEX.md` or anything in `_gen/`; regenerate them.
- **During migration, a migrated trip's `trip.md` is overwritten by `tools/import-trees.mjs`.** Until cutover, change *plans* in Trees and re-import. `me/*.md` and every `log.md` are curated here now and are never overwritten.
- **Machine data is YAML, judgment is Markdown.** Dates, coordinates, bookings, `verified`, `source`: YAML (frontmatter or a fenced ```yaml block). Everything else is prose.
- **Schedule lines have one fixed shape**, because they're what gets edited from a phone:
  `- 6:15 → 6:40 (25m) · drive · Text in Markdown · 📍 Maps search string`
  A `!` after the kind (`stop!`) means warn. The maps part is optional and always last.

## Memory: how the brain stays true

- **Capture fast, file carefully.** A new fact from Colin goes to the one file it belongs in, with a provenance tag in italics:
  `*(stated 2026-09-27)*`, `*(confirmed: kentucky-2026 log)*`, `*(recalled, ~2023)*`, `*(source: nps.gov/bisf, 2026-09)*`.
- **Preferences carry evidence.** A preference learned on a trip links to that trip's `log.md`. A preference with no evidence is labelled as stated, not confirmed.
- **Update, don't append.** If a new fact supersedes an old one, change the old line and keep a short "was: …" note if the history matters. Two versions of one fact in two places is the failure mode this repo exists to prevent.
- **Hypotheses stay hypotheses.** A pattern you *infer* (e.g. "maybe mayonnaise is the problem") gets written as a hypothesis and never enforced until Colin confirms it. See the patterns section in `me/food.md`.
- **Nothing gets deleted to make a warning go away.** Resolve it in the data or argue with it out loud.

## Ask Colin, don't assume

Colin wants to be asked. When a fact is missing, two files disagree, or a preference is being *inferred* rather than stated, ask him, **multiple choice where possible** (he's usually on a phone), a few questions per round, with an "Other" escape. Then write each answer to the one file it belongs in, with a provenance tag, and commit. The Kentucky retro (`trips/kentucky-2026/log.md`, 2026-09-27) is the worked example: 4 rounds that answered 3 gear questions, resolved 2 contradictions (ramen, stargazing), sharpened a principle (ruins) and produced a plan-vs-actual table.

After any trip, run a retro the same way: plan vs. what actually happened, day by day, then the patterns. Plans are hypotheses; logs are evidence.

## Non-negotiables (carried over from Trees)

1. **Never invent a coordinate.** `verified: false` with null lat/lng is the correct output for an unknown location. A pin 200 m off routes someone to a locked gate on a one-lane road with no cell service.
2. **Never invent a bookable fact:** confirmation numbers, prices, opening hours, permit windows. Write `TBD`, an explicit range, or name the source.
3. **Warnings are for what can hurt someone or kill the day**, not general advice.
4. **An honest `outline` beats a fake `planned`.** Say what you don't know.
5. **Never hand-type a sunrise, sunset or booking-window date.** They're computed.
6. **Colin has oral allergy syndrome.** Roasted nuts are confirmed fine; raw and dried fruit are still open. Spice ceiling 1–2 of 5. No coffee, no beer. Current details are in `me/food.md`.
7. The working style Colin wants from you is in `me/working-rules.md`. Read it.

## Commands

```bash
npm install                                   # once; build-time only (yaml)
npm test                                      # format round-trip tests
node tools/index.mjs                          # regenerate INDEX.md; --check in CI
node tools/macros.mjs                         # recompute kitchen/staples.md totals; --check in CI
TREES=../Trees node tools/import-trees.mjs kentucky-2026   # re-import a trip
node tools/import-trees.mjs --me              # me/*.md; refuses to overwrite without --force
```

After any change: `npm test && node tools/index.mjs`, and commit `INDEX.md` with it.

## Environment limits

`nps.gov`, `recreation.gov`, `overpass-api.de`, `nominatim.openstreetmap.org` and `parks.canada.ca` are blocked from Claude Code cloud sessions. Facts from those sites come back only as search-result quotes, and should be labelled that way. AllTrails and AccuWeather MCP tools work. Coordinates come from Colin via Trees' `mapbench.html` (to be ported), never from a guess.

## Where this is going

The approved plan, in order: (1) prototype the format on Kentucky + `me/` and prove it with `evals/`. **This is where things are now.** (2) Migrate everything, then port the validator. (3) A GitHub Action builds the website from these files. (4) Skills: `/log`, `/remember`, `/retro`, `/backfill`, `/new-trip`, `/preflight`. (4b) `/gardener`, a weekly contradiction-and-staleness sweep that **opens a PR and never auto-merges**. (5) Cut over and freeze Trees.
