# Using the travel brain from Claude Code: a short guide

Written 2026-09-30 after the first week turned up every one of the mixups below.

## The one idea

**`main` is the memory. Everything else is a draft.**

Every Claude Code chat works on its own branch (`claude/something`). What it writes there is invisible to every other chat until it's merged into `main`. So nearly every mixup comes down to one of three things: work that never got merged, work merged in the wrong direction, or two chats editing from different starting points.

## Your rules (five of them)

1. **Let Claude open the PR. Don't tap the app's "Create PR" button** if Claude already made one. PR #5 was that button creating a backwards PR, `main → claude/pensive-euler…`, which merges memory *into* an old draft. If you ever do use the button, check the arrow first: it must read **`claude/… → main`**.
2. **Before you merge, check two things:** the base is `main`, and the checks are green. Merge with the default **"Create a merge commit"**.
3. **After merging, say "merged".** Claude then pulls `main`, confirms your change is in it, and republishes the site.
4. **One chat per job, and one job at a time per trip.** Two chats editing the same trip at once start from different versions and collide. Finish (merge) one, then start the next. Asking questions in a second chat is fine; only edits collide.
5. **New work goes in a new chat.** Once a chat's PR is merged, that chat's branch is done. For a follow-up, start fresh; the new chat begins from the latest `main` and gets the briefing. (If you do keep going in an old chat, Claude restarts its branch from `main` first.)

## What Claude does on its own

| Change | Who merges |
|---|---|
| `/log` (log only), `/remember` (one `me/` file), `/daydream` (wishlist only) | Claude, once checks pass, and it confirms "in main" |
| Anything touching a trip plan, tools, skills or several files | **You.** Claude opens the PR and tells you its number |

Every new chat also opens with a **briefing** (`tools/now.mjs`) and a **branch check**. The check says which branch the chat is on, whether it's behind `main`, and which other branches hold work that isn't in `main`. If the check lists something you care about, say "merge that" or "drop that".

## Quick answers

- **"Did that save?"** Ask "is it in main?" Claude checks rather than assumes. If the answer is no, it names the PR you need to merge.
- **"I see a PR into a `claude/…` branch."** It's backwards. Close it without merging.
- **"There are old branches everywhere."** Turn on GitHub → repo **Settings → General → "Automatically delete head branches"** (once, per repo), and delete the old ones from the **Branches** page. From then on, every merged PR cleans up after itself. Claude's sessions can't delete branches, so this one is yours.
- **"Two PRs touch the same file."** Merge the older one first, then tell the other chat "main moved, update your branch". It merges `main` in and re-runs the checks.
- **"The site looks out of date."** Say "republish the site". It's rebuilt from `main`.

## Claude's side of the deal (also in CLAUDE.md)

- Start from the latest `main`. If the branch check says "behind", pull first.
- One branch and one PR per piece of work, always into `main`.
- Never open a PR *from* `main`, and never leave the session sitting on `main` after committing work. The app's PR button uses whatever branch the session is on.
- Finish every change one of two ways: merged and confirmed "in main", or a plain line saying "⚠️ not in memory yet, merge PR #N".
