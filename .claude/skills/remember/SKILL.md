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
- **Other copies elsewhere:** grep this repo *and* note Trees' copy (`data/profile.js`, `data/meals.js`). This repo can't fix Trees in one step, so **tell Colin in your reply** that Trees still says the old thing.

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

## 5. Reply

One line on what changed, plus any conflict you resolved or Trees copy left stale.
