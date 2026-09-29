# Trail Notes, rebuilt: Colin's travel brain

This repo *is* the assistant's memory. Colin asks questions and makes changes from the Claude app; a website renders the same files for glancing at in the field. There's no database and no hidden state: if it isn't in a file here, it isn't known.

**Status: cut over from Trees on 2026-09-29.** Everything lives here now: `me/`, six trips in `trips/`, 33 ideas in `wishlist/` and the `kitchen/`. The old repo, `FriendOfMankind/Trees`, is **frozen**. Its site is a snapshot, and its 67-recipe library stays there on purpose (staples replaced it). Don't edit Trees and don't treat it as current. `INDEX.md` is the authoritative list of what's here.

## Start every question here

1. **Read `INDEX.md` first.** It's generated, and it lists every file with a one-line summary and status. Then open only what the question needs.
2. **Where answers live:**
   - Preferences, constraints, gear, calendar: `me/*.md` (one topic per file)
   - A trip's plan: `trips/<slug>/trip.md`
   - An idea, and everything researched about it: `wishlist/<slug>.md`
   - Where a place is: `trips/<slug>/places.yaml`
   - What to eat, with macros: `kitchen/staples.md`
   - **What actually happened / past experience: `trips/<slug>/log.md`**
3. **Cite the file** you got an answer from. On a phone that's how Colin knows whether you read it or remembered it.
4. **Say which kind of fact it is:** verified (has a source), recalled (from Colin's memory), planned (a decision, not an observation) or unknown. "Not recorded" is a correct and useful answer. A confident guess is not.
5. If two files disagree, **say so and name both.** Don't silently pick one; contradictions are the most valuable thing you can surface.

## Making changes

- **Content changes are file changes.** Edit the md/yaml, run the checks, commit and push. Never hand-edit `INDEX.md` or anything in `_gen/`; regenerate them.
- **Every file is curated here.** Edit `trip.md` directly. A plan change is Colin's call. A decision in `log.md` that isn't in `trip.md` yet is drift, so fix the plan in the same change rather than leaving a "pending" list. `tools/import-trees.mjs` is retired and refuses to overwrite anything.
- **Machine data is YAML, judgment is Markdown.** Dates, coordinates, bookings, `verified`, `source`: YAML (frontmatter or a fenced ```yaml block). Everything else is prose.
- **Schedule lines have one fixed shape**, because they're what gets edited from a phone:
  `- 6:15 → 6:40 (25m) · drive · Text in Markdown · 📍 Maps search string`
  A `!` after the kind (`stop!`) means warn. The maps part is optional and always last.

## Skills: the on-the-road tools

- **`/log`**: something happened on a trip. It goes to that trip's `log.md`, and the skill self-merges a log-only change.
- **`/remember`**: a standing fact or preference. It goes to the one `me/` or `kitchen/` file it belongs in, after a conflict check, and self-merges when narrow.
- **`/retro <slug>`**: the post-trip interview. It writes a plan-vs-actual table, patterns and carry-forward. Colin merges it himself.
- **`/preflight`**: the read-only pre-departure check (T-14/T-7/T-1). Open calls, gear gaps, contradictions inside the plan, and the forecast once it's in range. It reports; it never edits.
- **`/daydream`**: exploring, not planning. Riff on an idea, chase an activity, hunt for hidden gems, or ask "what fits May?". Findings go into `wishlist/<slug>.md` with sources, and the skill self-merges a wishlist-only change.

## Branches

**`main` is the memory.** Every session opens its PR into `main`. A note sitting on an unmerged session branch is invisible to the next session, so small `/log` and `/remember` changes merge themselves once checks pass (see each skill for the limits). Anything bigger waits for Colin.

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
node tools/build.mjs                          # site/index.html (one self-contained page; not offline yet)
```

**The site, until Phase 3:** a private claude.ai page, https://claude.ai/artifact/FWuwTKkLnDTCYn9z4QNaP9. After content changes, run `node tools/build.mjs` and republish `site/index.html` to **that URL** (the Artifact tool's `url`), never as a new page.

After any change: `npm test && node tools/index.mjs`, and commit `INDEX.md` with it.

## Environment limits

`nps.gov`, `recreation.gov`, `overpass-api.de`, `nominatim.openstreetmap.org` and `parks.canada.ca` are blocked from Claude Code cloud sessions. Facts from those sites come back only as search-result quotes, and should be labelled that way. AllTrails and AccuWeather MCP tools work. Coordinates come from Colin via Trees' `mapbench.html` (to be ported), never from a guess.

## Where this is going

The approved plan, in order: (1) prototype the format on Kentucky + `me/` and prove it with `evals/`. **Done: eval run 1 passed on 2026-09-28** (see the run log in `evals/questions.md`). (2) Migrate everything, then port the validator. **Migration done 2026-09-29 (cutover).** Not done yet: the validator port. Until it exists, nothing mechanically checks coordinates-need-sources, declined terms or outline-needs-questions in the migrated trips, so those rules rest on you. (3) The website: a GitHub Action, offline support, and the booking-window agenda Trees computed (see `docs/SITE.md`). **Nothing counts down to booking windows right now.** They're in each trip's `booking:` frontmatter plus `me/booking.md`, and `/preflight` is the only thing reading them. (4) Skills: `/log`, `/remember` and `/retro` built 2026-09-28; `/preflight` 2026-09-29; `/daydream` 2026-09-29. `/backfill` and `/new-trip` are still to come. (4b) `/gardener`, a weekly contradiction-and-staleness sweep that **opens a PR and never auto-merges**.
