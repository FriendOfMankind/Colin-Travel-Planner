---
name: log
description: Save what just happened on a trip to that trip's log, from one sentence on a phone. Use when Colin says "log", "/log", "note that…", or reports something that happened on a trip (a hike, a campsite, a meal, a road, a problem) rather than a standing preference.
---

# /log: record what happened

Colin is probably on a phone at a trailhead. Be fast, be short, and don't lose what he said.

## 1. Which trip?

- Get today's date from the system (`date +%F`). **Never guess a date.**
- The trip is the one in `INDEX.md` whose dates contain today. If none does, use the one that ended most recently. If he names a trip, use that.
- If two could fit, or the note is about a trip other than the current one, ask **one** multiple-choice question and stop.

## 2. Write the entry

Append to `trips/<slug>/log.md`, **after the last dated entry and before any `## Retro` section**:

```
## YYYY-MM-DD · <3–6 word title>

> <his words, as close to verbatim as makes sense>

<optional: one or two lines of context from the plan, e.g. "Day 4 plan had Kaymoor 7:55–9:55; this was the actual">
```

- **Don't add facts he didn't say.** No invented times, distances, names or ratings. If the plan gives useful context, like which day this is, cite the plan and label it as the plan.
- If the note **contradicts the plan** or a `me/` fact, add a line starting `⚠️ Differs from` naming the file, and tell him in your reply. Don't edit the plan from here: a plan change is Colin's call, made as its own edit to `trip.md`.
- If the note implies a **standing preference or a gear change** ("never again", "loved it", "the spatula broke"), don't edit `me/` from here. End your reply with a one-line offer: *"Want me to /remember that?"*

## 3. Save it

```bash
npm test && node tools/index.mjs
git add -A && git commit -m "log: <slug> <date> — <title>"
git push -u origin <session branch>
```

Then open a PR into `main` and **merge it once checks pass.** Colin invoking `/log` is his approval for this one change, but only if the diff touches nothing beyond that `log.md` and `INDEX.md`. If anything else changed, stop and ask. Unmerged, the next session won't see the note, and memory that the next session can't see isn't memory.

## Verify it landed. Never skip this step.

A note on an unmerged branch is invisible to the next session. On 2026-09-28 a phone `/remember` wrote a whole `me/adventures.md` to its session branch, never opened a PR, and reported success anyway. Nobody knew until a later session found the branch. So after merging:

```bash
git fetch origin main && git merge-base --is-ancestor HEAD origin/main && echo IN-MAIN
```

- **`IN-MAIN` printed:** say "Saved to memory."
- **Otherwise** (no GitHub tools, no permission, checks failed, merge refused): **say so plainly as the first line of your reply.** For example: *"⚠️ Saved on branch `<name>` but NOT in memory yet. Merge PR #N (or tell a session with GitHub access to) or the next session won't see it."* Never report success for a change that isn't on `main`.

## 4. Reply

One or two lines: what was saved and where, plus any ⚠️ or /remember offer. No summary of the trip.
