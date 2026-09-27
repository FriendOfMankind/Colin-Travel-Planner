# Colin-Travel-Planner — AI-first rebuild of Trail Notes

## Context

Trees (the old repo) is a static site whose content lives in JS objects: `data/trips.js` (39 registry entries), `data/profile.js`, `data/meals.js`, and 6 trip pages at 40–90 KB of `data.js` each, carrying ~1,500 inline HTML tags. It has a good discipline layer: a validator, `verified` flags, `[V]/[U]/[?]` intake, and computed sun and booking dates. It also has a good display: hub tabs, trip tabs, offline support, print, and GPX/ICS export.

Colin wants to ask an AI about trips from his phone and edit them the same way, and to have preferences and past trips recorded somewhere the AI can use.

Decisions made:
- **The AI is the Claude app / Claude Code running against the repo.** The repo is built to be read and edited by an agent. No in-site chatbot, no API key, no backend.
- **Port everything** with a re-runnable converter. Nothing gets retyped by hand.
- **A GitHub Action builds the site.** The deployed site still has no runtime dependencies and still works offline.
- **Past trips only exist in Colin's memory.** They get backfilled through an interview skill. Kentucky 2026 (ended today, no retro yet) is the first one.

The central diagnosis is that the storage is what's wrong for AI, not the display. So the plan rebuilds storage and keeps the renderer's logic: Trees' `js/trip.js`, `js/hub.js`, `js/derive.js`, `js/exports.js`, `tools/lib/astro.mjs` and the tests get ported, not rewritten.

Scale check: the whole corpus is about 610 KB, roughly 150k tokens. That needs no embeddings, vector database or RAG. An agent with grep, a generated index and a clear file layout will beat a retrieval pipeline here.

## Two front doors, one set of files
- **Website (read, glance, use in the field):** the hub, trip day cards, map, checklists, search, and a "What's changed / gardener findings" panel. It is fast, visual and works offline, and it's what you open at a trailhead.
- **Claude app (ask, change, remember):** questions, edits, `/log`, `/remember`, `/retro`. Every change is a commit, the Action rebuilds, and the site updates within a couple of minutes.
- The site never needs the AI, and the AI never needs the site. Both read the same md/yaml files.
- An in-site chat box stays a possible later add-on, built only if the two-door setup proves annoying in real use. It needs a backend proxy for the API key, costs money per question, and doesn't work offline.

## Storage model: "facts in YAML, judgment in prose, derived things computed"

Markdown is the right answer, but not *pure* Markdown. Anything a tool must check (dates, coordinates, bookings, `verified`, `source`) sits in YAML frontmatter or a fenced ```yaml block. Everything else is Markdown prose that the AI can read and rewrite freely. The validator parses both.

```
CLAUDE.md                  the AI's operating manual: how to answer, how to edit, the non-negotiables
INDEX.md                   GENERATED. One line per file: path · status · dates · one-line summary.
                           The AI reads this first, then opens only what it needs.
me/                        who Colin is. One topic per file, each short (<3k tokens)
  profile.md               home base, vehicle, ceilings, trip shape
  food.md                  OAS (what's confirmed vs open), spice 1–2/5, no coffee/beer, restaurant rule
  hiking.md                distance/gain ceiling, difficulty appetite, crowds
  camping.md               PRINCIPLES (car camping only, access roads, dawn starts…)
  declined.md              DECLINED + AVOID; `terms` stay in frontmatter so the validator can grep them
  gear.md                  gear locker as a yaml block + prose; gear `question`s point at the trip that answers them
  calendar.md              AVAILABILITY, booking windows, the "horizon" (graduation May 2027)
  working-rules.md         how Claude should behave (from WORKING_RULES)
trips/<slug>/
  trip.md                  frontmatter = registry entry (status, start, months, mode, bookings, theme…)
                           body = Why · Overview · Days (one `## Day N — date` heading each, with a small
                           yaml block for date/overnight/driving, then schedule bullets) · Hikes · Budget ·
                           Open questions · Notes
  places.yaml              waypoints: name, lat/lng, verified, source. Machine data; mapbench writes this
  log.md                   dated on-trip notes + the retro. This is the "past experience" record
  _gen/                    GENERATED, never read by the AI: route/trail polylines, sun tables
kitchen/
  doctrine.md              cooler zones, pantry, constraints
  recipes/<id>.md          one recipe per file; frontmatter keeps `usedOn` (validator-checked), `review: oas`
  dishes.yaml              Menu Bench candidates
wishlist → just trips/<slug>/trip.md with status: wishlist and no Days section
```

Why this shape works for an AI:
- **One topic per file.** A question about food opens `me/food.md` (2k tokens) instead of a 27 KB profile blob.
- **The file path is metadata.** `trips/*/log.md` is "everything that happened". `me/*` is "what I prefer".
- **Preferences carry evidence.** A line like `Roasted nuts: fine — confirmed (kentucky-2026 retro)` links back to the log. That turns preferences from assertions into a memory web, and it gives the retro skill somewhere to write.
- **Big machine data (polylines, sun tables) lives in `_gen/`.** It stays out of the way so it can't flood the AI's context.

## Phases

### Phase 0 — don't let this eat October (days, not weeks)
Appalachians leaves Oct 15. Trees stays the live source of truth until cutover, and its trip pages keep working. Kentucky's retro gets *written in the new format* as the pilot (Phase 1), so it counts as both trip work and prototype work.

### Phase 1 — prototype the format on one trip (the real decision point)
1. Hand-design `me/*.md` and `trips/kentucky-2026/{trip.md,places.yaml,log.md}` with a converter that handles only that trip: `tools/import-trees.mjs`. It reads Trees through the existing `tools/lib/site.mjs` → `loadHub()` / `loadTrip()`, then turns HTML to Markdown and objects to YAML.
2. Run a Kentucky retro interview (a draft of the retro skill) and write `log.md`. Update `me/*` with evidence links.
3. **AI eval:** write `evals/questions.md`, about 20 real questions with expected answers and source files. Examples: "what's my spice ceiling?", "where do I sleep Oct 17?", "which Appalachians nights have no written confirmation?", "what gear question does Mojave answer?", "what did I think of Honey Creek?". Plus 5 edit tasks, such as "push day 3 lunch to day 4". Run them in a *fresh* Claude session given only the new repo. Grade: correct, cites the file, says "unverified/unknown" where it should. Iterate on the layout until this passes. That is the evidence that the format works, as opposed to vibes.

### Phase 2 — full migration + validator
- Extend the converter to all 39 registry entries, all 6 trips, meals and dishes. It is re-runnable and deterministic, so Trees can keep being edited until cutover.
- Port `tools/validate.mjs` to read md/yaml through a shared loader, `tools/lib/load.mjs`, which replaces `site.mjs`. Keep every check: verified/source, declined terms, `usedOn` both directions, outline needs open questions, sequential dates, nightly lodging, generated files current.
- Write `tools/index.mjs` → `INDEX.md` + `site/data/*.json`.
- Port the tests (`tools/test/*.test.mjs`) and `astro.mjs` unchanged.

### Phase 3 — display
- `tools/build.mjs`: md/yaml → JSON in the shapes `js/trip.js` and `js/hub.js` already consume. Markdown → HTML at build time. Build-only devDependencies (a YAML parser and a Markdown parser); none ship.
- Port `js/`, `css/`, `vendor/leaflet`, `sw.js`/manifest, and mapbench/menubench (changed to emit YAML for `places.yaml` / `dishes.yaml`).
- Add a search tab: a client-side search over a build-generated index. It is small and works offline.
- The GitHub Action runs tests, validates, builds, and deploys to Pages. CI blocks deploy on validator failure.

### Phase 4 — the AI layer (skills in `.claude/skills/`)
- `CLAUDE.md` answering protocol: read `INDEX.md` first; cite files; separate verified from unverified; say "not recorded" rather than guess; never hand-type sun or booking dates.
- `/log` — append a dated note to the current trip's `log.md` from the phone.
- `/retro <slug>` — post-trip interview → `log.md` + evidence-linked updates to `me/*` and gear questions.
- `/backfill` — interview about a pre-Trees trip from memory → `trips/<slug>/` with status `done`. Facts from memory are tagged as recalled, not verified.
- `/new-trip` — ported from Trees, targeting the new format; `docs/TRIPFORMAT.md` comes across.
- `/preflight <slug>` — the T-14/T-7/T-1 read-only check from the Trees roadmap.

### Phase 4b — "second brain": memory that updates and tidies itself
Colin added this mid-planning: a Jarvis-style assistant whose memory updates itself, cleans itself up and finds contradictions. Design it so the AI **proposes** changes and a human **accepts** them. The rule "nothing writes unattended" from Trees' ROADMAP still holds, because unattended changes are how a confident wrong fact gets into a plan.

- **Memory model.** Every durable claim in `me/*` and `trip.md` gets a short provenance tag: `(stated 2026-09 | confirmed: kentucky-2026 log | recalled)`. This lets the AI date a fact, trace where it came from and weigh one fact against another.
- **`inbox.md` — capture without structure.** From the phone: "remember I hated the Koomer Ridge pit toilets". `/remember` files it into the right `me/` or `log.md` with provenance. If it's unclear where it belongs, it stays in the inbox and gets asked about later.
- **Contradiction finding, two layers.**
  - *Deterministic* (validator, every commit): the same fact disagrees across files. Examples: registry dates vs Day headings, a booking marked done vs a missing confirmation, a declined activity appearing in an itinerary, a gear question pointing at a trip that has already passed.
  - *Semantic* (an LLM pass): claims that conflict in prose, like the Kentucky K-L2 "confirmed workable" vs "conflict" contradiction the Trees roadmap caught by hand. `/gardener` walks topic pairs (each `me/*` file vs each trip, each trip's overview vs its days) and writes `reports/gardener-YYYY-MM-DD.md`: contradictions, stale facts, duplicates, unfiled inbox items. Each finding comes with a proposed patch.
- **Self-cleaning = a scheduled routine that opens a PR.** A weekly Claude Code Routine runs `/gardener` plus `/preflight` on trips within 30 days and opens one PR titled with the count of findings. Colin merges from the GitHub app, or not. It never auto-merges.
- **Eval addition.** Plant 5 known contradictions and 3 stale facts in a copy of the repo. The gardener must find at least 7/8 with no more than 2 false alarms before the weekly Routine is switched on.

### Phase 5 — cutover
Final converter run, then freeze Trees (README → new repo). Also update the TRIPFORMAT intake doc's paths.

## Known friction to settle during Phase 1
- **Phone edits and branches.** Claude Code sessions push to a branch, so changes don't reach the live site until merged. Options: merge from the GitHub mobile app, or let the skills push small data-only edits straight to `main` with CI as the guard. Decide after trying it.
- **Offline AI doesn't exist.** The site works offline; the Claude app doesn't. The field fallback is still the printed or cached page.

## Critical files
- New: `CLAUDE.md`, `me/*.md`, `trips/*/trip.md|places.yaml|log.md`, `tools/import-trees.mjs`, `tools/lib/load.mjs`, `tools/validate.mjs`, `tools/index.mjs`, `tools/build.mjs`, `.github/workflows/build.yml`, `.claude/skills/{log,retro,backfill,new-trip,preflight,remember,gardener}/SKILL.md`, `inbox.md`, `reports/`, `evals/questions.md`, `evals/planted-contradictions/`
- Ported from Trees: `js/{trip,hub,ui,derive,exports,offline,themes,coordcheck}.js`, `css/*`, `sw.js`, `tools/lib/astro.mjs`, `tools/test/*`, `mapbench.html`, `menubench.html`, `docs/TRIPFORMAT.md`

## Verification
- `node --test "tools/test/*.test.mjs"` passes (the ported astro/derive/export tests unchanged).
- `node tools/validate.mjs` exits 0. A round-trip check shows the converter output, rebuilt to JSON, matches Trees' `data/trips.json` field for field for the registry.
- The eval set in `evals/questions.md` passes in a fresh session: at least 18/20 answers correct *and* cited, and every "unknown" question answered as unknown.
- The built site is served locally and checked with Playwright: hub tabs render, each trip's tabs render, the map plots only verified pins, and the page works offline after first load.
- One real phone round-trip: `/log` from the Claude mobile app → commit → CI green → visible on the site.
