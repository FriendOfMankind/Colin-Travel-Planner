---
name: retro
description: Run a post-trip retro as a multiple-choice interview (plan vs. what actually happened, day by day, then the patterns) and write the answers into the log and me/ files with provenance. Use when Colin says "/retro", "retro", "the trip's over", or wants to review how a trip went.
---

# /retro <slug>: plans are hypotheses, logs are evidence

The worked example is `trips/kentucky-2026/log.md` (2026-09-27): 4 rounds that answered 3 gear questions, resolved 2 contradictions, sharpened a principle and produced a plan-vs-actual table. Match its shape.

## 0. Prepare (before asking anything)

Read `trips/<slug>/trip.md`, all of `trips/<slug>/log.md` (the `/log` entries from the trip are your best evidence), `me/gear.md`, `me/food.md`, `me/hiking.md` and `kitchen/staples.md`. Collect:

- Every gear `question:` with `answeredBy: <slug>`
- Every open question in `trip.md` and every "the trip will answer this" line anywhere
- A one-line summary of each day's plan
- The food plan, as planned

## 1. Ask in rounds

**Multiple choice, at most 4 questions per round, always with an escape for "Other".** He's on a phone. Order:

1. **Anything with a deadline**, like gear needed for the next trip.
2. **Day by day, 4 days per round:** "Basically as planned / Some changes / Very different", each with the plan summary in the question. Follow up on anything that changed.
3. **Food reality:** what was actually eaten versus the plan.
4. **Preferences the trip tested,** and anything that contradicts `me/`.

Read every answer literally. If it contradicts a file or an earlier answer, ask; don't pick one yourself.

**Commit after every round,** so nothing is lost if the session ends.

## 2. Write it down

In `trips/<slug>/log.md`:

- **`## <date> · Plan vs. what actually happened, day by day`**: a table with columns Day | Plan | Actual | Gap.
- **`### What the gap says`**: numbered patterns. Label each one as **evidence (n trips)** or **hypothesis (one data point)**, and count data points across trips (earlier logs count). Don't promote a pattern to a rule on one trip.
- **`## Retro (<date>)`**: the checklist of questions, each ticked with its answer.

Then, with provenance `*(confirmed: <slug> log)*`:

- Gear `answer:` fields and state changes go in `me/gear.md`.
- Preferences go in `me/*.md`, updated in place with "was:" notes. Hypotheses stay hypotheses.
- Food reality goes in `me/food.md` and `kitchen/staples.md`.
- **Carry-forward:** add a dated entry to the *next* trip's `log.md` listing what this trip implies for it. Don't change its plan; plan changes go through Trees and need Colin's call.

## 3. Close it out

- **Hunt for stale promises:** grep for lines saying this trip "will answer" or "can settle" something, and rewrite each with what actually happened.
- The trip's `status: done` lives in the Trees registry until cutover. Say that in the log and in your reply.
- Run `npm test && node tools/index.mjs`, commit, push, and open a PR into `main`. A retro touches many files, so **Colin merges it himself.** Don't self-merge.
- Reply with the 3–5 findings that change future plans, plus anything still open.
