---
name: remember
description: File a preference, fact or gear change about Colin into the one me/ (or kitchen/) file it belongs in, with provenance, checking for contradictions first. Use when Colin says "remember", "/remember", "from now on", "I bought/lost/broke…", "I like/hate…", or states a standing fact about himself.
---

# /remember: update the memory without breaking it

The failure this repo exists to prevent is **two versions of one fact.** Every step below serves that.

## 1. Find the one file

Read `INDEX.md`, then the `me/` (or `kitchen/`) file whose summary fits. Search for what's already recorded on the topic before writing:

```bash
grep -rin "<keyword>" me/ kitchen/ trips/*/log.md
```

## 2. Check for conflicts before writing

- **Conflicts with evidence** (a `log.md` says otherwise): don't write yet. Ask one multiple-choice question naming both sides.
  - Worked example: "I tried dried mango on the trip and my mouth itched" while the Kentucky log says no dried fruit was eaten. The answer is to ask which trip or when, not to cite the Kentucky log.
- **Supersedes an older line:** change that line in place, and keep a short `(was: …)` if the history matters. Never add a second line saying the new thing.
- **Other copies elsewhere:** grep the whole repo, `trips/*/trip.md` and `wishlist/` included, and fix every copy in the same change. Trees has been frozen since 2026-09-29, so its copy doesn't count.

## 3. Write it with provenance

Tag it in italics: `*(stated YYYY-MM-DD)*` using **today's real date**, or `*(confirmed: <slug> log)*` when it rests on a logged experience.

- **One data point is not a rule.** "My mouth itched after dried mango" makes dried mango a stated trigger. It does **not** make "all dried fruit" one. Anything broader is written as a *hypothesis* and never enforced.
- **Declined activities, never-foods and rejected dishes** go in the frontmatter lists (`declined`, `avoid`, `dislikes`) with `terms`, because that's what the validator greps.
- **Gear:** change `state` in the yaml block (`own`, `need`, `replace`, `unknown`), and answer any open `question:` it settles with an `answer:` field.

## 4. Save it

Same flow as `/log`:

```bash
npm test && node tools/index.mjs && node tools/macros.mjs --check
```

Commit (`remember: <what>`), push, open a PR into `main`, and merge once checks pass, but only if the diff is limited to the file(s) this fact belongs in plus `INDEX.md`. Anything broader, ask first.

## Verify it landed. Never skip this step.

A note on an unmerged branch is invisible to the next session. On 2026-09-28 a phone `/remember` wrote a whole `me/adventures.md` to its session branch, never opened a PR, and reported success anyway. Nobody knew until a later session found the branch. So after merging:

```bash
git fetch origin main && git merge-base --is-ancestor HEAD origin/main && echo IN-MAIN
```

- **`IN-MAIN` printed:** say "Saved to memory."
- **Otherwise** (no GitHub tools, no permission, checks failed, merge refused): **say so plainly as the first line of your reply.** For example: *"⚠️ Saved on branch `<name>` but NOT in memory yet. Merge PR #N (or tell a session with GitHub access to) or the next session won't see it."* Never report success for a change that isn't on `main`.

## 5. Reply

One line on what changed, plus any conflict you resolved.
