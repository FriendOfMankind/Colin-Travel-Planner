---
name: gardener
description: Sweep the repo for drift (contradictions, stale lines, log decisions the plan doesn't carry, rule breaches, disagreeing copies of one fact). A free mechanical pass first, then finder agents on what changed since the last run, then a verifier that tries to refute every finding. Reports, offers fixes, never merges content fixes itself. Use when Colin says "/gardener", "garden", "sweep for contradictions", "what's stale", "check the repo", or the briefing shows mechanical drift findings.
---

# /gardener: find the second version of a fact before it bites

Two versions of one fact is the failure this repo exists to prevent (`CLAUDE.md`). The gardener hunts them. It costs Colin's plan usage, so it spends tokens in order of cheapness: code first, then agents only on what changed, then one verifier.

## 0. Pick the mode

| Mode | When | Finders | Reads |
|---|---|---|---|
| **lite** (default) | "garden", or the briefing flagged something | ≤ 2 | files changed since the last run, plus what they point at |
| **deep** | "deep garden", the first run, or every ~5th run | ≤ 4 | everything live (skip `shelved` trips, `docs/`, `evals/`) |
| **mechanical** | "quick garden" | 0 | nothing: step 1 only, no tokens beyond reading the output |

Say which mode you're running in one line, then go.

## 1. Mechanical pass (free)

`node tools/garden.mjs --json`. It checks gear questions a finished trip should have answered, promises about trips that are over, log decisions newer than the plan, and copies of pinned facts (`garden/pins.yaml`) that disagree. Findings in `garden/dismissed.yaml` are already filtered out. `scope` names the files changed since the last run.

These findings are deterministic, so they skip the verifier. Carry them straight to the report.

## 2. Finders (lite: ≤ 2, deep: ≤ 4)

Spawn `garden-finder` agents in parallel, **one per slice**, only for slices with a file in scope. Never let a finder spawn another agent.

| Slice | Files | Cross-check against |
|---|---|---|
| **Colin** | `me/*.md`, `kitchen/*.md`, the non-negotiables in `CLAUDE.md` | each other |
| **Trip: `<slug>`** (one per live trip in scope; nearest departure first) | `trip.md`, `log.md`, `research.md`, `places.yaml` | `me/food.md`, `me/gear.md`, `me/declined.md`, `me/hiking.md` |
| **Ideas** | `wishlist/*.md` in scope, `bucket.yaml` | `me/calendar.md` (horizon), the trips their `trip:` / `wishlist:` point at |

If more slices are in scope than the mode allows, take the trips leaving soonest, then Colin, then Ideas, and say what got skipped.

Each finder's prompt must name: the slice's files, the cross-check files, the mechanical findings already raised (so it doesn't repeat them), and **today's date** (`date +%F`, never guessed). For a lite run, add: "Only raise findings that touch a line in these changed files: <list>." The agent definition carries the rest.

## 3. Verifier

One `garden-verifier` agent gets every finder finding, numbered, **without the finders' reasoning beyond each finding's Why line**. It returns CONFIRMED / REFUTED / UNSURE per item.

- Drop REFUTED. Keep a count: that's the finders' noise.
- Before reporting, drop anything whose fingerprint is in `garden/dismissed.yaml` (fingerprint = `kind|fileA|claim`, lower-cased).

## 4. Report

He's on a phone. First line:

`Garden · <mode> · <n> mechanical · <raised> raised → <survived> survived`

Then tiers, one line each, citing both files:

| Tier | What |
|---|---|
| 🔴 **Could hurt him** | A contradiction or breach on a live trip inside 30 days (a closed road still planned, a meal with raw fruit, a booking the plan and the checklist disagree on) |
| 🟠 **Contradiction** | Two current claims disagree. **Don't pick a winner.** Ask, multiple choice, A / B / other |
| 🟡 **Stale** | Promises, answered open questions, outgrown summaries, log drift |
| ⚪ **Copies** | A fact stored 3+ times. Propose one home, or a pin in `garden/pins.yaml` if it must stay copied |

UNSURE items go under their tier, marked `(unsure)`.

End with a multiple-choice offer:
- (a) fix the 🟡 stale lines (no decisions involved)
- (b) answer the 🟠 questions, then fix
- (c) dismiss some: "dismiss 3, 5" (ask why, one line)
- (d) nothing

## 5. Fix, record, ship

- **Fixes:** edit in place with a `(was: …)` note and provenance, the normal way. A 🟠 never gets fixed without his answer. A pinned fact that changed means its `garden/pins.yaml` entry changes in the same commit.
- **Dismissals:** append to `garden/dismissed.yaml`: `{ fingerprint, date, reason }`, his reason in his words.
- **Ledger:** append one row to `garden/runs.md`, with today's date, the `HEAD` commit this run swept (`git rev-parse --short HEAD`, taken *before* your fixes), the mode, and the counts. Leave **Missed** at 0. It's filled later, when someone finds drift by hand that this run should have caught.
- `npm test && node tools/index.mjs`, then branch and PR into `main`.
- **Merges itself** only if the diff touches nothing but `garden/runs.md` and `garden/dismissed.yaml`. Any content fix waits for Colin: end with "⚠️ not in memory yet, merge PR #N".

## 6. Getting better (when he says "improve the gardener", or every ~5 runs)

The gardener improves from evidence, never from vibes, and never by editing itself without review:

1. **Read the ledger.** A check or finding kind that keeps landing in `dismissed.yaml` is noisy: tighten its wording in `garden-finder.md`, or its pattern in `tools/lib/garden.mjs`, and add a test that pins the false alarm.
2. **Read the misses.** Drift found by hand (by `/preflight`, a retro, or Colin) goes into `evals/questions.md` § Seeds for the gardener, and the run that should have caught it gets **Missed** +1. If the class is pattern-decidable, make it a mechanical check with a test. If not, add one line to the finder's "What counts".
3. **Gate.** `npm test` must pass, and a lite run on the current data must not raise anything already in `dismissed.yaml`. One change per PR, and Colin merges it. Keep a short list of rejected changes at the bottom of this file, so the same bad idea isn't proposed twice.

## Rejected changes

*(none yet)*
